import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import { pool, checkDbConnection } from '../config/db';
import { geminiKeyManager } from '../config/gemini-keys';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';

// Bộ nhớ đệm cho kết quả tìm kiếm RAG và Query Embeddings (TTL 10 phút)
const ragQueryCache = new NodeCache({ stdTTL: 600, checkperiod: 120, maxKeys: 1000 });
const queryVectorCache = new NodeCache({ stdTTL: 1800, checkperiod: 300, maxKeys: 2000 });

export interface KnowledgeDocument {
  id: string;
  filename: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  chunksCount: number;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  category: string;
  sectionTitle?: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
}

// In-Memory cache for lightning-fast RAG retrieval
class RagService {
  private documents: KnowledgeDocument[] = [];
  private chunks: KnowledgeChunk[] = [];
  private isInitialized = false;
  private isVectorizing = false;

  /**
   * Khởi tạo và nạp cơ sở tri thức từ các file Markdown
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.loadAndChunkDocuments();
    this.isInitialized = true;

    // Vectorize chunks in background or immediately
    this.vectorizeAllChunks().catch((err) => {
      console.warn('⚠️ [RAG] Background vectorization note:', err.message);
    });
  }

  /**
   * Đọc thư mục data/knowledge và cắt nhỏ văn bản thành các chunks
   */
  public async loadAndChunkDocuments(): Promise<void> {
    let knowledgeDir = path.join(__dirname, '../data/knowledge');
    
    try {
      await fs.access(knowledgeDir);
    } catch {
      // Fallback sang thư mục src khi chạy từ dist
      const srcKnowledgeDir = path.join(__dirname, '../../src/data/knowledge');
      try {
        await fs.access(srcKnowledgeDir);
        knowledgeDir = srcKnowledgeDir;
      } catch {
        console.warn(`[RAG] Thư mục knowledge chưa tồn tại ở cả ${knowledgeDir} và ${srcKnowledgeDir}.`);
        return;
      }
    }

    const files = await fs.readdir(knowledgeDir);
    const mdFiles = files.filter((f) => f.endsWith('.md') && f !== 'README.md');

    const loadedDocs: KnowledgeDocument[] = [];
    const loadedChunks: KnowledgeChunk[] = [];

    for (const filename of mdFiles) {
      const filePath = path.join(knowledgeDir, filename);
      const rawText = await fs.readFile(filePath, 'utf-8');

      // Extract title from first # header or filename
      const titleMatch = rawText.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/, '');
      const docId = `doc-${filename.replace(/\.md$/, '')}`;

      // Determine category from filename
      let category = 'general';
      if (filename.includes('bao_hanh')) category = 'warranty';
      else if (filename.includes('doi_tra')) category = 'refund';
      else if (filename.includes('van_chuyen')) category = 'shipping';
      else if (filename.includes('thanh_toan')) category = 'payment';
      else if (filename.includes('tu_van')) category = 'buying_guide';
      else if (filename.includes('doanh_nghiep')) category = 'company_info';
      else if (filename.includes('thuong_hieu') || filename.includes('brand')) category = 'brand_info';
      else if (filename.includes('danh_gia') || filename.includes('review')) category = 'review_policy';

      // Generate a short 1-line summary
      const firstParagraph = rawText
        .split('\n\n')
        .find((p) => p.trim() && !p.startsWith('#'))
        ?.replace(/\n/g, ' ')
        .slice(0, 150) || `${title} chính thức tại BK-Store.`;

      // Split into sections by H2 headers (##)
      const chunks = this.createChunksFromMarkdown(rawText, docId, title, category);

      const doc: KnowledgeDocument = {
        id: docId,
        filename,
        title,
        category,
        summary: firstParagraph + '...',
        content: rawText,
        chunksCount: chunks.length,
        updatedAt: new Date().toISOString().split('T')[0],
      };

      loadedDocs.push(doc);
      loadedChunks.push(...chunks);
    }

    this.documents = loadedDocs;
    this.chunks = loadedChunks;

    console.log(`📚 [RAG] Đã nạp ${this.documents.length} tài liệu tri thức (${this.chunks.length} chunks) thành công.`);
  }

  /**
   * Thuật toán phân đoạn Markdown thông minh theo ngữ cảnh
   */
  private createChunksFromMarkdown(
    markdown: string,
    docId: string,
    docTitle: string,
    category: string
  ): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    const sections = markdown.split(/(?=^#{2,3}\s+)/m);
    let chunkIndex = 0;

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      // Extract section header if present
      const headerMatch = trimmed.match(/^#{2,3}\s+(.+)$/m);
      const sectionTitle = headerMatch ? headerMatch[1].trim() : undefined;
      const sectionContent = trimmed.replace(/^#{2,3}\s+.+$/m, '').replace(/^---\s*$/gm, '').trim();

      if (!sectionContent) continue;

      // If section is short enough (<= 1000 chars), make it a single complete chunk
      if (sectionContent.length <= 1000) {
        chunks.push({
          id: `${docId}-chunk-${chunkIndex}`,
          documentId: docId,
          documentTitle: docTitle,
          category,
          sectionTitle,
          chunkIndex: chunkIndex++,
          content: `[Tài liệu: ${docTitle}]${sectionTitle ? ` [Mục: ${sectionTitle}]` : ''}\n${sectionContent}`,
        });
      } else {
        // Split sectionContent into sub-paragraphs cleanly without cutting sentences in half
        const paragraphs = sectionContent.split(/\n\n+/);
        let currentChunk = '';

        for (const p of paragraphs) {
          const para = p.trim();
          if (!para) continue;

          if ((currentChunk + '\n\n' + para).length > 850 && currentChunk.length > 200) {
            chunks.push({
              id: `${docId}-chunk-${chunkIndex}`,
              documentId: docId,
              documentTitle: docTitle,
              category,
              sectionTitle,
              chunkIndex: chunkIndex++,
              content: `[Tài liệu: ${docTitle}]${sectionTitle ? ` [Mục: ${sectionTitle}]` : ''}\n${currentChunk.trim()}`,
            });
            currentChunk = para;
          } else {
            currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
          }
        }

        if (currentChunk.trim().length > 30) {
          chunks.push({
            id: `${docId}-chunk-${chunkIndex}`,
            documentId: docId,
            documentTitle: docTitle,
            category,
            sectionTitle,
            chunkIndex: chunkIndex++,
            content: `[Tài liệu: ${docTitle}]${sectionTitle ? ` [Mục: ${sectionTitle}]` : ''}\n${currentChunk.trim()}`,
          });
        }
      }
    }

    return chunks;
  }

  /**
   * Tính toán Dense Vector Embeddings bằng mô hình Gemini
   */
  public async vectorizeAllChunks(): Promise<void> {
    if (this.isVectorizing) return;
    this.isVectorizing = true;

    let cacheFile = path.join(__dirname, '../data/knowledge/.embeddings_cache.json');
    let cacheMap: Record<string, number[]> = {};

    try {
      const rawCache = await fs.readFile(cacheFile, 'utf-8');
      cacheMap = JSON.parse(rawCache);
    } catch {
      const srcCacheFile = path.join(__dirname, '../../src/data/knowledge/.embeddings_cache.json');
      try {
        const rawCache = await fs.readFile(srcCacheFile, 'utf-8');
        cacheMap = JSON.parse(rawCache);
        cacheFile = srcCacheFile;
      } catch {
        cacheMap = {};
      }
    }

    // Restore from cache first
    let cachedCount = 0;
    for (const chunk of this.chunks) {
      if (cacheMap[chunk.id] && cacheMap[chunk.id].length > 0) {
        chunk.embedding = cacheMap[chunk.id];
        cachedCount++;
      }
    }

    if (cachedCount === this.chunks.length) {
      console.log(`⚡ [RAG] Đã nạp toàn bộ ${cachedCount} vector embeddings từ bộ nhớ đệm (Cache). Khởi động tức thì!`);
      this.isVectorizing = false;
      return;
    }

    try {
      if (!genAI) {
        console.warn('⚠️ [RAG] Chưa có GEMINI_API_KEY. Hệ thống sẽ sử dụng thuật toán Vector Hybrid / TF-IDF nội bộ.');
        return;
      }

      const embedModel = genAI.getGenerativeModel({ model: EMBED_MODEL });
      console.log(`🧬 [RAG] Đang tính toán Embeddings cho ${this.chunks.length - cachedCount} chunks mới bằng model ${EMBED_MODEL}...`);

      let count = 0;
      for (const chunk of this.chunks) {
        if (chunk.embedding && chunk.embedding.length > 0) continue;

        try {
          const res = await embedModel.embedContent(chunk.content);
          if (res?.embedding?.values) {
            chunk.embedding = res.embedding.values;
            cacheMap[chunk.id] = res.embedding.values;
            count++;
          }
        } catch (e: unknown) {
          console.warn(`[RAG] Không thể tính vector cho chunk ${chunk.id}:`, (e as Error).message);
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Persist to cache file
      try {
        await fs.writeFile(cacheFile, JSON.stringify(cacheMap), 'utf-8');
        console.log(`💾 [RAG] Đã lưu ${Object.keys(cacheMap).length} vector embeddings vào bộ nhớ đệm.`);
      } catch (err: unknown) {
        console.warn('[RAG] Không thể lưu cache file:', (err as Error).message);
      }

      console.log(`✅ [RAG] Hoàn tất tính toán Embeddings cho ${count + cachedCount}/${this.chunks.length} chunks.`);

      // Tự động đồng bộ lên PostgreSQL PGVector nếu Database đang sẵn sàng
      this.syncToPgVector().catch((err) => {
        console.warn('⚠️ [PGVector] Background sync notice:', err.message);
      });
    } finally {
      this.isVectorizing = false;
    }
  }

  /**
   * Đồng bộ toàn bộ dữ liệu tài liệu và vector chunks vào PostgreSQL PGVector
   */
  public async syncToPgVector(): Promise<void> {
    try {
      const isDbReady = await checkDbConnection();
      if (!isDbReady) {
        return;
      }

      const client = await pool.connect();
      try {
        // Kiểm tra xem bảng knowledge_chunks đã có dữ liệu vector chưa
        const checkRes = await client.query('SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL');
        const count = parseInt(checkRes.rows[0].count, 10);

        if (count >= this.chunks.length) {
          console.log(`⚡ [PGVector] Cơ sở dữ liệu PostgreSQL đã có đầy đủ ${count} vector chunks.`);
          return;
        }

        console.log(`📤 [PGVector] Đang đồng bộ ${this.chunks.length} chunks vào PostgreSQL PGVector...`);
        await client.query('BEGIN');

        for (const doc of this.documents) {
          const docRes = await client.query(
            `INSERT INTO knowledge_documents (title, category, source_file)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [doc.title, doc.category, doc.filename]
          );

          let docDbId: string;
          if (docRes.rows.length > 0) {
            docDbId = docRes.rows[0].id;
          } else {
            const existing = await client.query(
              `SELECT id FROM knowledge_documents WHERE title = $1 LIMIT 1`,
              [doc.title]
            );
            docDbId = existing.rows[0]?.id;
          }

          if (!docDbId) continue;

          const docChunks = this.chunks.filter((c) => c.documentId === doc.id);
          for (const chunk of docChunks) {
            const vectorStr = chunk.embedding && chunk.embedding.length > 0 
              ? `[${chunk.embedding.join(',')}]` 
              : null;

            await client.query(
              `INSERT INTO knowledge_chunks (document_id, chunk_index, content, metadata, embedding)
               VALUES ($1, $2, $3, $4, ${vectorStr ? '$5::vector' : 'NULL'})
               ON CONFLICT DO NOTHING`,
              vectorStr 
                ? [docDbId, chunk.chunkIndex, chunk.content, JSON.stringify({ sectionTitle: chunk.sectionTitle }), vectorStr]
                : [docDbId, chunk.chunkIndex, chunk.content, JSON.stringify({ sectionTitle: chunk.sectionTitle })]
            );
          }
        }

        await client.query('COMMIT');
        console.log(`✅ [PGVector] Đồng bộ hóa thành công dữ liệu tri thức vào PostgreSQL PGVector.`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.warn('⚠️ [PGVector] Lỗi khi đồng bộ vector vào PostgreSQL:', err.message);
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('⚠️ [PGVector] Database chưa sẵn sàng để đồng bộ vector:', err.message);
    }
  }

  /**
   * Tính độ tương đồng Cosine Similarity giữa 2 vector
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Tính điểm tương đồng từ khóa nâng cao (Enhanced Lexical & Context Scoring)
   * Kết hợp:
   * 1. Term Match Ratio: Tỉ lệ từ khóa truy vấn xuất hiện trong nội dung
   * 2. Exact Phrase Match: Điểm thưởng nếu chứa nguyên vẹn cụm từ tìm kiếm
   * 3. Title & Section Bonus: Điểm thưởng nếu từ khóa xuất hiện trong tiêu đề tài liệu / tiêu đề mục
   */
  private computeLexicalScore(
    qWords: string[],
    queryLower: string,
    chunk: KnowledgeChunk
  ): number {
    if (qWords.length === 0) return 0;
    const contentLower = chunk.content.toLowerCase();
    const docTitleLower = (chunk.documentTitle || '').toLowerCase();
    const secTitleLower = (chunk.sectionTitle || '').toLowerCase();

    // 1. Tỉ lệ khớp từ đơn (Term match ratio)
    let termMatches = 0;
    for (const w of qWords) {
      if (contentLower.includes(w)) {
        termMatches++;
      }
    }
    const termRatio = termMatches / qWords.length;

    // 2. Điểm thưởng khớp cụm từ chính xác (Exact Phrase Match Bonus)
    let phraseBonus = 0;
    if (queryLower.length >= 6 && contentLower.includes(queryLower)) {
      phraseBonus = 0.35;
    } else if (qWords.length >= 2) {
      // Thử khớp bigram 2 từ liền kề
      const bigram = `${qWords[0]} ${qWords[1]}`;
      if (contentLower.includes(bigram)) {
        phraseBonus = 0.2;
      }
    }

    // 3. Điểm thưởng tiêu đề mục & tài liệu (Title Relevance Bonus)
    let titleBonus = 0;
    let titleMatches = 0;
    for (const w of qWords) {
      if (docTitleLower.includes(w) || secTitleLower.includes(w)) {
        titleMatches++;
      }
    }
    if (titleMatches > 0) {
      titleBonus = Math.min(0.3, (titleMatches / qWords.length) * 0.3);
    }

    // Tổng hợp điểm số từ khóa chuẩn hóa [0, 1]
    return Math.min(1.0, termRatio * 0.5 + phraseBonus + titleBonus);
  }

  /**
   * TÌM KIẾM TRI THỨC NGỮ NGHĨA
   * Kiến trúc lai (Hybrid Engine):
   * 1. Kiểm tra Cache RAG nhanh (0ms) với chuỗi truy vấn đã chuẩn hóa
   * 2. Ưu tiên PostgreSQL + PGVector (với HNSW Index)
   * 3. Fallback mượt mà sang bộ nhớ đệm In-Memory nếu Database offline
   */
  public async search(query: string, topK = 3): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery || this.chunks.length === 0) {
      return [];
    }

    // 1. Chuẩn hóa chuỗi truy vấn & Kiểm tra Cache RAG nhanh (0ms)
    const normalizedQuery = trimmedQuery
      .toLowerCase()
      .replace(/[\?\.!,;:\-_—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const cacheKey = `rag:${normalizedQuery}:${topK}`;
    const cachedResults = ragQueryCache.get<SearchResult[]>(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }

    // 2. Tiền xử lý từ khóa truy vấn
    const qWords = normalizedQuery
      .replace(/[^a-z0-9à-ỹ\s]/gi, '')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    // 3. Tính toán Vector truy vấn (kèm Cache & Tự động Failover Key nếu hết hạn ngạch)
    let queryVector: number[] | null = queryVectorCache.get<number[]>(normalizedQuery) || null;

    if (!queryVector && geminiKeyManager.getKeyCount() > 0) {
      try {
        queryVector = await geminiKeyManager.executeWithRotation(async (activeGenAI) => {
          const embedModel = activeGenAI.getGenerativeModel({ model: EMBED_MODEL });
          const embedPromise = embedModel.embedContent(trimmedQuery);
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Embedding API timeout')), 2500)
          );
          const res: any = await Promise.race([embedPromise, timeoutPromise]);
          return res?.embedding?.values || null;
        });
        if (queryVector) {
          queryVectorCache.set(normalizedQuery, queryVector);
        }
      } catch (err: unknown) {
        // Fall back mượt mà sang Hybrid Lexical nếu hết hạn mức API hoặc mạng chậm
      }
    }

    // 4. Ưu tiên tìm kiếm bằng PostgreSQL PGVector nếu Database đang Online
    if (queryVector && queryVector.length > 0) {
      try {
        const isDbReady = await checkDbConnection();
        if (isDbReady) {
          const vectorStr = `[${queryVector.join(',')}]`;
          const pgSql = `
            SELECT 
              kc.id,
              kc.chunk_index AS "chunkIndex",
              kc.content,
              kd.id AS "documentId",
              kd.title AS "documentTitle",
              kd.category,
              1 - (kc.embedding <=> $1::vector) AS score
            FROM knowledge_chunks kc
            JOIN knowledge_documents kd ON kc.document_id = kd.id
            WHERE kc.embedding IS NOT NULL
            ORDER BY kc.embedding <=> $1::vector
            LIMIT $2;
          `;
          const { rows } = await pool.query(pgSql, [vectorStr, topK]);
          if (rows && rows.length > 0) {
            const pgResults: SearchResult[] = rows.map((r: any) => ({
              chunk: {
                id: r.id,
                documentId: r.documentId,
                documentTitle: r.documentTitle,
                category: r.category,
                chunkIndex: r.chunkIndex,
                content: r.content,
              },
              score: parseFloat(r.score) || 0,
            }));
            ragQueryCache.set(cacheKey, pgResults);
            return pgResults;
          }
        }
      } catch (pgErr: any) {
        // Tự động chuyển sang fallback bộ nhớ mà không làm gián đoạn người dùng
      }
    }

    // 5. Fallback: Thuật toán In-Memory Hybrid Search tối ưu hóa cao
    const scoredResults: SearchResult[] = [];

    for (const chunk of this.chunks) {
      const lexical = this.computeLexicalScore(qWords, normalizedQuery, chunk);
      let vectorSim = 0;

      if (queryVector && chunk.embedding && chunk.embedding.length === queryVector.length) {
        vectorSim = this.cosineSimilarity(queryVector, chunk.embedding);
      }

      // Điểm số kết hợp (Hybrid Score): 65% Dense Vector + 35% Enhanced Lexical
      const finalScore =
        queryVector && chunk.embedding && chunk.embedding.length === queryVector.length
          ? vectorSim * 0.65 + lexical * 0.35
          : lexical;

      scoredResults.push({
        chunk,
        score: finalScore,
      });
    }

    // Sắp xếp giảm dần theo độ tương quan
    scoredResults.sort((a, b) => b.score - a.score);

    const finalFiltered = scoredResults.filter((r) => r.score > 0.15).slice(0, topK);

    // Lưu vào cache
    ragQueryCache.set(cacheKey, finalFiltered);
    return finalFiltered;
  }

  /**
   * Lấy danh sách toàn bộ tài liệu nguồn cho Admin Dashboard
   */
  public getDocuments(): KnowledgeDocument[] {
    return this.documents;
  }

  /**
   * Lấy toàn bộ chunks của 1 tài liệu theo ID
   */
  public getChunksByDocId(docId: string): KnowledgeChunk[] {
    return this.chunks.filter((c) => c.documentId === docId);
  }

  /**
   * Thống kê tổng quan cho RAG Metrics
   */
  public getMetrics() {
    return {
      documentsCount: this.documents.length,
      chunksCount: this.chunks.length,
      vectorizedCount: this.chunks.filter((c) => c.embedding && c.embedding.length > 0).length,
      embedModel: EMBED_MODEL,
      embeddingDimensions: 3072,
    };
  }
}

// Export singleton instance
export const ragService = new RagService();

import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { pool, checkDbConnection } from '../config/db';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const EMBED_MODEL = 'gemini-embedding-001';

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
    const knowledgeDir = path.join(__dirname, '../data/knowledge');
    
    try {
      await fs.access(knowledgeDir);
    } catch {
      console.warn(`[RAG] Thư mục ${knowledgeDir} chưa tồn tại.`);
      return;
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

    const cacheFile = path.join(__dirname, '../data/knowledge/.embeddings_cache.json');
    let cacheMap: Record<string, number[]> = {};

    try {
      const rawCache = await fs.readFile(cacheFile, 'utf-8');
      cacheMap = JSON.parse(rawCache);
    } catch {
      cacheMap = {};
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
    } finally {
      this.isVectorizing = false;
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
   * Tính điểm tương đồng từ khóa / Lexical Overlap cho tiếng Việt
   */
  private lexicalScore(query: string, content: string): number {
    const qWords = query.toLowerCase().replace(/[^a-z0-9à-ỹ\s]/gi, '').split(/\s+/).filter((w) => w.length > 1);
    if (qWords.length === 0) return 0;

    const lowerContent = content.toLowerCase();
    let matches = 0;

    for (const w of qWords) {
      if (lowerContent.includes(w)) {
        matches++;
      }
    }

    return matches / qWords.length;
  }

  /**
   * TÌM KIẾM TRI THỨC NGỮ NGHĨA (Hybrid Semantic Search)
   * Kết hợp Dense Vector Cosine Similarity + Lexical Overlap
   */
  public async search(query: string, topK = 3): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!query.trim() || this.chunks.length === 0) {
      return [];
    }

    let queryVector: number[] | null = null;

    // Try computing query embedding via Gemini
    if (genAI) {
      try {
        const embedModel = genAI.getGenerativeModel({ model: EMBED_MODEL });
        const res = await embedModel.embedContent(query);
        if (res?.embedding?.values) {
          queryVector = res.embedding.values;
        }
      } catch (err: unknown) {
        // Fall back to lexical if API limit / offline
        console.warn('[RAG Search] Embedding API fallback to lexical search:', (err as Error).message);
      }
    }

    const scoredResults: SearchResult[] = [];

    for (const chunk of this.chunks) {
      const lexical = this.lexicalScore(query, chunk.content);
      let vectorSim = 0;

      if (queryVector && chunk.embedding && chunk.embedding.length === queryVector.length) {
        vectorSim = this.cosineSimilarity(queryVector, chunk.embedding);
      }

      // Hybrid Score: 70% Dense Vector + 30% Lexical matching
      const finalScore = queryVector && chunk.embedding ? vectorSim * 0.7 + lexical * 0.3 : lexical;

      scoredResults.push({
        chunk,
        score: finalScore,
      });
    }

    // Sort by highest score descending
    scoredResults.sort((a, b) => b.score - a.score);

    // Return Top-K results with score > 0.15 threshold
    return scoredResults.filter((r) => r.score > 0.15).slice(0, topK);
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

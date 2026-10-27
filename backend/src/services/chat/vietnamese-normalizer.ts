/**
 * Module Chuẩn hóa Tiếng Việt Thương mại Điện tử (Vietnamese E-commerce Normalizer)
 * Chuyên xử lý teencode, từ lóng công nghệ, viết tắt thiết bị, đơn vị tiền tệ đời thường và lỗi gõ Telex/Unikey.
 */
export class VietnameseNormalizer {
  // Bản đồ từ viết tắt & tiếng lóng công nghệ đặc thù
  private static readonly TECH_SLANG_MAP: Record<string, string> = {
    'lap': 'laptop',
    'láp': 'laptop',
    'prm': 'pro max',
    'promax': 'pro max',
    'ip': 'iphone',
    'tuf': 'asus tuf gaming',
    'loq': 'lenovo loq',
    'tp': 'thinkpad',
    'tb': 'thinkbook',
    'vivo': 'vivobook',
    'xps': 'dell xps',
    'zen': 'zenbook',
    'xm5': 'sony wh-1000xm5',
    'airpod': 'airpods',
    'keychron': 'keychron',
    'anker': 'anker',
  };

  // Bản đồ sửa lỗi gõ dính phím Telex / Unikey
  private static readonly TELEX_TYPO_MAP: Record<string, string> = {
    'mays': 'máy',
    'tinhs': 'tính',
    'muas': 'mua',
    'gias': 'giá',
    'ddeer': 'để',
    'khoong': 'không',
    'dduowjc': 'được',
    'laptopw': 'laptop',
    'laptpop': 'laptop',
    'vivobookf': 'vivobook',
    'thinkpadd': 'thinkpad',
    'iphonne': 'iphone',
    'samsun': 'samsung',
    'samsum': 'samsung',
    'xiao mi': 'xiaomi',
    'redmi': 'xiaomi',
    'logi': 'logitech',
  };

  /**
   * Chuẩn hóa tiền tệ và khoảng giá
   * vd: "20-30 củ" -> "20 triệu đến 30 triệu"
   * vd: "tầm 15tr" -> "tầm 15 triệu"
   * vd: "dưới 20 củ" -> "dưới 20 triệu"
   */
  public static normalizeCurrency(text: string): string {
    let result = text;

    // Khoảng giá dạng "20 - 30 củ", "20-30tr", "15 - 25 củ"
    result = result.replace(
      /(^|\s)(\d+)\s*(?:-|–|—|đến|toi|to)\s*(\d+)\s*(?:củ|cu|tr|trieu|triệu|m)(?=\s|$|[.,!?;:])/gi,
      '$1$2 triệu đến $3 triệu'
    );

    // Dạng số đơn lẻ: "20 củ", "15tr", "500k", "2 củ rưỡi"
    result = result.replace(
      /(^|\s)(\d+)\s*(?:củ|cu)\s*rưỡi(?=\s|$|[.,!?;:])/gi,
      '$1$2.5 triệu'
    );
    result = result.replace(
      /(^|\s)(\d+(?:\.\d+)?)\s*(?:củ|cu|tr|trieu|triệu|m)(?=\s|$|[.,!?;:])/gi,
      '$1$2 triệu'
    );
    result = result.replace(
      /(^|\s)(\d+)\s*k(?=\s|$|[.,!?;:])/gi,
      '$1$2 nghìn'
    );

    return result;
  }

  /**
   * Chuẩn hóa tiếng địa phương và đại từ chỉ định
   * vd: "con nì", "máy lày", "em ni" -> "máy này"
   */
  public static normalizePronouns(text: string): string {
    let result = text;
    result = result.replace(
      /(^|\s)(?:con|máy|cái|em)\s+(?:nì|lày|ni|lầy)(?=\s|$|[.,!?;:])/gi,
      '$1máy này'
    );
    result = result.replace(
      /(^|\s)(?:con|máy|chiếc)\s+đầu\s*tiên(?=\s|$|[.,!?;:])/gi,
      '$1máy thứ 1'
    );
    result = result.replace(
      /(^|\s)(?:con|máy|chiếc)\s+thứ\s*nhất(?=\s|$|[.,!?;:])/gi,
      '$1máy thứ 1'
    );
    result = result.replace(
      /(^|\s)(?:con|máy|chiếc)\s+thứ\s*hai(?=\s|$|[.,!?;:])/gi,
      '$1máy thứ 2'
    );
    result = result.replace(
      /(^|\s)(?:con|máy|chiếc)\s+thứ\s*ba(?=\s|$|[.,!?;:])/gi,
      '$1máy thứ 3'
    );
    return result;
  }

  /**
   * Sửa lỗi Telex / Unikey gõ nhầm
   */
  public static fixTelexTypos(text: string): string {
    let words = text.split(/\s+/);
    words = words.map((w) => {
      const lower = w.toLowerCase();
      if (this.TELEX_TYPO_MAP[lower]) {
        return this.TELEX_TYPO_MAP[lower];
      }
      return w;
    });
    return words.join(' ');
  }

  /**
   * Mở rộng từ viết tắt và tiếng lóng công nghệ
   * vd: "ip16" -> "iphone 16", "lap tuf" -> "laptop asus tuf gaming"
   */
  public static expandTechSlang(text: string): string {
    let result = text;

    // Tách riêng cụm ghép dính số như "ip16", "ip17", "ip18", "ip15"
    result = result.replace(/\bip\s*(\d{2})\b/gi, 'iphone $1');

    // Tách từng từ và tra cứu từ điển
    const words = result.split(/\s+/);
    const expanded = words.map((w) => {
      const lower = w.toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, '');
      if (this.TECH_SLANG_MAP[lower]) {
        return this.TECH_SLANG_MAP[lower];
      }
      return w;
    });

    return expanded.join(' ');
  }

  /**
   * Hàm chuẩn hóa toàn diện trước khi đưa vào NLU Pipeline
   */
  public static normalize(rawText: string): string {
    if (!rawText || !rawText.trim()) return '';

    let text = rawText.trim();
    text = this.fixTelexTypos(text);
    text = this.normalizeCurrency(text);
    text = this.normalizePronouns(text);
    text = this.expandTechSlang(text);

    return text.trim();
  }
}

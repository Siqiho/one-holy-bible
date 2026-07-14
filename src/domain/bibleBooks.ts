export type Testament = "old" | "new";

export interface BibleBook {
  id: string;
  chineseName: string;
  chineseShortName: string;
  englishName: string;
  testament: Testament;
  chapterCount: number;
  verseCounts: number[];
  aliases: string[];
}

const oldTestament: Array<Omit<BibleBook, "testament" | "aliases"> & { aliases?: string[] }> = [
  { id: "Gen", chineseName: "创世记", chineseShortName: "创", englishName: "Genesis", chapterCount: 50, verseCounts: [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26], aliases: ["Ge", "Gn"] },
  { id: "Exod", chineseName: "出埃及记", chineseShortName: "出", englishName: "Exodus", chapterCount: 40, verseCounts: [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38], aliases: ["Ex", "Exo"] },
  { id: "Lev", chineseName: "利未记", chineseShortName: "利", englishName: "Leviticus", chapterCount: 27, verseCounts: [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34], aliases: ["Le"] },
  { id: "Num", chineseName: "民数记", chineseShortName: "民", englishName: "Numbers", chapterCount: 36, verseCounts: [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13], aliases: ["Nu", "Nm"] },
  { id: "Deut", chineseName: "申命记", chineseShortName: "申", englishName: "Deuteronomy", chapterCount: 34, verseCounts: [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12], aliases: ["De", "Dt"] },
  { id: "Josh", chineseName: "约书亚记", chineseShortName: "书", englishName: "Joshua", chapterCount: 24, verseCounts: [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33], aliases: ["Jos"] },
  { id: "Judg", chineseName: "士师记", chineseShortName: "士", englishName: "Judges", chapterCount: 21, verseCounts: [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25], aliases: ["Jdg"] },
  { id: "Ruth", chineseName: "路得记", chineseShortName: "得", englishName: "Ruth", chapterCount: 4, verseCounts: [22, 23, 18, 22], aliases: ["Ru"] },
  { id: "1Sam", chineseName: "撒母耳记上", chineseShortName: "撒上", englishName: "1 Samuel", chapterCount: 31, verseCounts: [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13], aliases: ["1Samue", "First Samuel", "I Samuel"] },
  { id: "2Sam", chineseName: "撒母耳记下", chineseShortName: "撒下", englishName: "2 Samuel", chapterCount: 24, verseCounts: [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25], aliases: ["Second Samuel", "II Samuel"] },
  { id: "1Kgs", chineseName: "列王记上", chineseShortName: "王上", englishName: "1 Kings", chapterCount: 22, verseCounts: [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53], aliases: ["1Kings", "First Kings", "I Kings"] },
  { id: "2Kgs", chineseName: "列王记下", chineseShortName: "王下", englishName: "2 Kings", chapterCount: 25, verseCounts: [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30], aliases: ["2Kings", "Second Kings", "II Kings"] },
  { id: "1Chr", chineseName: "历代志上", chineseShortName: "代上", englishName: "1 Chronicles", chapterCount: 29, verseCounts: [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30], aliases: ["1Chronicles", "First Chronicles", "I Chronicles"] },
  { id: "2Chr", chineseName: "历代志下", chineseShortName: "代下", englishName: "2 Chronicles", chapterCount: 36, verseCounts: [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23], aliases: ["2Chronicles", "Second Chronicles", "II Chronicles"] },
  { id: "Ezra", chineseName: "以斯拉记", chineseShortName: "拉", englishName: "Ezra", chapterCount: 10, verseCounts: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44], aliases: ["Ezr"] },
  { id: "Neh", chineseName: "尼希米记", chineseShortName: "尼", englishName: "Nehemiah", chapterCount: 13, verseCounts: [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31], aliases: ["Ne"] },
  { id: "Esth", chineseName: "以斯帖记", chineseShortName: "斯", englishName: "Esther", chapterCount: 10, verseCounts: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3], aliases: ["Est"] },
  { id: "Job", chineseName: "约伯记", chineseShortName: "伯", englishName: "Job", chapterCount: 42, verseCounts: [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17] },
  { id: "Ps", chineseName: "诗篇", chineseShortName: "诗", englishName: "Psalms", chapterCount: 150, verseCounts: [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6], aliases: ["Psalm"] },
  { id: "Prov", chineseName: "箴言", chineseShortName: "箴", englishName: "Proverbs", chapterCount: 31, verseCounts: [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31], aliases: ["Pr"] },
  { id: "Eccl", chineseName: "传道书", chineseShortName: "传", englishName: "Ecclesiastes", chapterCount: 12, verseCounts: [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14], aliases: ["Ecclesiastesor", "Ecc"] },
  { id: "Song", chineseName: "雅歌", chineseShortName: "歌", englishName: "Song of Songs", chapterCount: 8, verseCounts: [17, 17, 11, 16, 16, 13, 13, 14], aliases: ["Song of Solomon", "Canticles"] },
  { id: "Isa", chineseName: "以赛亚书", chineseShortName: "赛", englishName: "Isaiah", chapterCount: 66, verseCounts: [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24] },
  { id: "Jer", chineseName: "耶利米书", chineseShortName: "耶", englishName: "Jeremiah", chapterCount: 52, verseCounts: [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34] },
  { id: "Lam", chineseName: "耶利米哀歌", chineseShortName: "哀", englishName: "Lamentations", chapterCount: 5, verseCounts: [22, 22, 66, 22, 22] },
  { id: "Ezek", chineseName: "以西结书", chineseShortName: "结", englishName: "Ezekiel", chapterCount: 48, verseCounts: [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35], aliases: ["Eze"] },
  { id: "Dan", chineseName: "但以理书", chineseShortName: "但", englishName: "Daniel", chapterCount: 12, verseCounts: [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13], aliases: ["Da"] },
  { id: "Hos", chineseName: "何西阿书", chineseShortName: "何", englishName: "Hosea", chapterCount: 14, verseCounts: [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9] },
  { id: "Joel", chineseName: "约珥书", chineseShortName: "珥", englishName: "Joel", chapterCount: 3, verseCounts: [20, 32, 21] },
  { id: "Amos", chineseName: "阿摩司书", chineseShortName: "摩", englishName: "Amos", chapterCount: 9, verseCounts: [15, 16, 15, 13, 27, 14, 17, 14, 15] },
  { id: "Obad", chineseName: "俄巴底亚书", chineseShortName: "俄", englishName: "Obadiah", chapterCount: 1, verseCounts: [21] },
  { id: "Jonah", chineseName: "约拿书", chineseShortName: "拿", englishName: "Jonah", chapterCount: 4, verseCounts: [17, 10, 10, 11] },
  { id: "Mic", chineseName: "弥迦书", chineseShortName: "弥", englishName: "Micah", chapterCount: 7, verseCounts: [16, 13, 12, 13, 15, 16, 20] },
  { id: "Nah", chineseName: "那鸿书", chineseShortName: "鸿", englishName: "Nahum", chapterCount: 3, verseCounts: [15, 13, 19] },
  { id: "Hab", chineseName: "哈巴谷书", chineseShortName: "哈", englishName: "Habakkuk", chapterCount: 3, verseCounts: [17, 20, 19] },
  { id: "Zeph", chineseName: "西番雅书", chineseShortName: "番", englishName: "Zephaniah", chapterCount: 3, verseCounts: [18, 15, 20] },
  { id: "Hag", chineseName: "哈该书", chineseShortName: "该", englishName: "Haggai", chapterCount: 2, verseCounts: [15, 23] },
  { id: "Zech", chineseName: "撒迦利亚书", chineseShortName: "亚", englishName: "Zechariah", chapterCount: 14, verseCounts: [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21] },
  { id: "Mal", chineseName: "玛拉基书", chineseShortName: "玛", englishName: "Malachi", chapterCount: 4, verseCounts: [14, 17, 18, 6] },
];

const newTestament: Array<Omit<BibleBook, "testament" | "aliases"> & { aliases?: string[] }> = [
  { id: "Matt", chineseName: "马太福音", chineseShortName: "太", englishName: "Matthew", chapterCount: 28, verseCounts: [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20], aliases: ["Mt"] },
  { id: "Mark", chineseName: "马可福音", chineseShortName: "可", englishName: "Mark", chapterCount: 16, verseCounts: [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20], aliases: ["Mk"] },
  { id: "Luke", chineseName: "路加福音", chineseShortName: "路", englishName: "Luke", chapterCount: 24, verseCounts: [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53], aliases: ["Lk"] },
  { id: "John", chineseName: "约翰福音", chineseShortName: "约", englishName: "John", chapterCount: 21, verseCounts: [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25], aliases: ["Jn"] },
  { id: "Acts", chineseName: "使徒行传", chineseShortName: "徒", englishName: "Acts", chapterCount: 28, verseCounts: [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31] },
  { id: "Rom", chineseName: "罗马书", chineseShortName: "罗", englishName: "Romans", chapterCount: 16, verseCounts: [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27] },
  { id: "1Cor", chineseName: "哥林多前书", chineseShortName: "林前", englishName: "1 Corinthians", chapterCount: 16, verseCounts: [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24], aliases: ["1Corinthians", "First Corinthians", "I Corinthians"] },
  { id: "2Cor", chineseName: "哥林多后书", chineseShortName: "林后", englishName: "2 Corinthians", chapterCount: 13, verseCounts: [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14], aliases: ["2Corinthians", "Second Corinthians", "II Corinthians"] },
  { id: "Gal", chineseName: "加拉太书", chineseShortName: "加", englishName: "Galatians", chapterCount: 6, verseCounts: [24, 21, 29, 31, 26, 18] },
  { id: "Eph", chineseName: "以弗所书", chineseShortName: "弗", englishName: "Ephesians", chapterCount: 6, verseCounts: [23, 22, 21, 32, 33, 24] },
  { id: "Phil", chineseName: "腓立比书", chineseShortName: "腓", englishName: "Philippians", chapterCount: 4, verseCounts: [30, 30, 21, 23], aliases: ["Php"] },
  { id: "Col", chineseName: "歌罗西书", chineseShortName: "西", englishName: "Colossians", chapterCount: 4, verseCounts: [29, 23, 25, 18] },
  { id: "1Thess", chineseName: "帖撒罗尼迦前书", chineseShortName: "帖前", englishName: "1 Thessalonians", chapterCount: 5, verseCounts: [10, 20, 13, 18, 28], aliases: ["1Thessalonians", "First Thessalonians", "I Thessalonians"] },
  { id: "2Thess", chineseName: "帖撒罗尼迦后书", chineseShortName: "帖后", englishName: "2 Thessalonians", chapterCount: 3, verseCounts: [12, 17, 18], aliases: ["2Thessalonians", "Second Thessalonians", "II Thessalonians"] },
  { id: "1Tim", chineseName: "提摩太前书", chineseShortName: "提前", englishName: "1 Timothy", chapterCount: 6, verseCounts: [20, 15, 16, 16, 25, 21], aliases: ["1Timothy", "First Timothy", "I Timothy"] },
  { id: "2Tim", chineseName: "提摩太后书", chineseShortName: "提后", englishName: "2 Timothy", chapterCount: 4, verseCounts: [18, 26, 17, 22], aliases: ["2Timothy", "Second Timothy", "II Timothy"] },
  { id: "Titus", chineseName: "提多书", chineseShortName: "多", englishName: "Titus", chapterCount: 3, verseCounts: [16, 15, 15] },
  { id: "Phlm", chineseName: "腓利门书", chineseShortName: "门", englishName: "Philemon", chapterCount: 1, verseCounts: [25], aliases: ["Philemon"] },
  { id: "Heb", chineseName: "希伯来书", chineseShortName: "来", englishName: "Hebrews", chapterCount: 13, verseCounts: [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25] },
  { id: "Jas", chineseName: "雅各书", chineseShortName: "雅", englishName: "James", chapterCount: 5, verseCounts: [27, 26, 18, 17, 20], aliases: ["James"] },
  { id: "1Pet", chineseName: "彼得前书", chineseShortName: "彼前", englishName: "1 Peter", chapterCount: 5, verseCounts: [25, 25, 22, 19, 14], aliases: ["1Peter", "First Peter", "I Peter"] },
  { id: "2Pet", chineseName: "彼得后书", chineseShortName: "彼后", englishName: "2 Peter", chapterCount: 3, verseCounts: [21, 22, 18], aliases: ["2Peter", "Second Peter", "II Peter"] },
  { id: "1John", chineseName: "约翰一书", chineseShortName: "约壹", englishName: "1 John", chapterCount: 5, verseCounts: [10, 29, 24, 21, 21], aliases: ["1John", "First John", "I John", "约一"] },
  { id: "2John", chineseName: "约翰二书", chineseShortName: "约贰", englishName: "2 John", chapterCount: 1, verseCounts: [13], aliases: ["2John", "Second John", "II John", "约二"] },
  { id: "3John", chineseName: "约翰三书", chineseShortName: "约叁", englishName: "3 John", chapterCount: 1, verseCounts: [14], aliases: ["3John", "Third John", "III John", "约三"] },
  { id: "Jude", chineseName: "犹大书", chineseShortName: "犹", englishName: "Jude", chapterCount: 1, verseCounts: [25] },
  { id: "Rev", chineseName: "启示录", chineseShortName: "启", englishName: "Revelation", chapterCount: 22, verseCounts: [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21], aliases: ["Revelation of St. John the Divine", "The Revelation", "Apocalypse"] },
];

function withAliases(book: Omit<BibleBook, "testament" | "aliases"> & { aliases?: string[] }, testament: Testament): BibleBook {
  return {
    ...book,
    testament,
    aliases: [
      book.id,
      book.englishName,
      book.englishName.replace(/\s+/g, ""),
      book.chineseName,
      book.chineseShortName,
      ...(book.aliases ?? []),
    ],
  };
}

export const bibleBooks: BibleBook[] = [
  ...oldTestament.map((book) => withAliases(book, "old")),
  ...newTestament.map((book) => withAliases(book, "new")),
];

export const BIBLE_BOOKS = bibleBooks;
export const oldTestamentBooks = bibleBooks.filter((book) => book.testament === "old");
export const newTestamentBooks = bibleBooks.filter((book) => book.testament === "new");

export const bookAliases: Record<string, string> = Object.fromEntries(
  bibleBooks.flatMap((book) => book.aliases.map((alias) => [alias.toLocaleLowerCase(), book.id])),
);

export function getBibleBook(bookId: string): BibleBook | undefined {
  return bibleBooks.find((book) => book.id === bookId);
}

export function bookTitle(bookId: string): string {
  return getBibleBook(bookId)?.chineseName ?? bookId;
}

export function englishBookTitle(bookId: string): string {
  return getBibleBook(bookId)?.englishName ?? bookId;
}

export function chaptersForBook(bookId: string): number {
  return getBibleBook(bookId)?.chapterCount ?? 0;
}

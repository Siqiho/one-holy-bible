import type { StudyResource } from "../domain/resources";
import type { VerseId } from "../domain/verse";
import { BIBLE_BOOKS } from "../domain/bibleBooks";
import { parseVerseId, verseIdFromParts } from "../domain/verse";
import { genesisResourcePlacementByFilename } from "./genesisResourcePlacements";
import type { GenesisResourceSourceMeta } from "./genesisResourceSourceMeta";
import { genesisResourceSourceMetaByFilename } from "./genesisResourceSourceMeta";

type GenesisResourceGroup = {
  assetModules?: Record<string, string>;
  folderLabel: string;
  idPrefix: string;
  replacementAssetModules?: Record<string, string>;
  replacementFolderLabel?: string;
  replacementFileNamesByOriginal?: Map<string, string>;
  sourceFileNames?: string[];
  sourceFolder: string;
};

const sourcePackage = "文档图片内容提取_20260515_121143";
const genesisVerseCounts = BIBLE_BOOKS.find((book) => book.id === "Gen")?.verseCounts ?? [];

type ReaderCopy = {
  title: string;
  summary: string;
  body?: string;
  searchText?: string;
  verseReference?: string;
  evidence: string;
  confidence?: "high" | "medium" | "low";
};

const manualReaderCopyByFilename = new Map<string, ReaderCopy>([
  [
    "p001_img000_670x452.png",
    {
      title: "创世记",
      summary: "《创世记》《圣经综合解读》。",
      verseReference: "创世记导论",
      evidence: "封面/题名页，只含《创世记》《圣经综合解读》等书名信息。",
      confidence: "high",
    },
  ],
  [
    "p014_img002_669x195.png",
    {
      title: "创世记第 1 章第 1 节的希伯来原文",
      summary: "有 7 个词、28 个字母；所有字母所代表的数码之和是 2701。",
      verseReference: "Gen.1.1",
      evidence: "上图：创世记第 1 章第 1 节的希伯来原文有 7 个词、28 个字母，除了第 4 个词是虚词，共有 6 个词是有实际意义的，并且所有字母所代表的数码之和是 2701。",
      confidence: "high",
    },
  ],
  [
    "p048_img032_720x525.png",
    {
      title: "古代美索不达米亚平原",
      summary: "美索不达米亚（Mesopotamia）是古希腊人对两河流域的称呼，两条河指幼发拉底河（Euphrates）和底格里斯河（Tigris）。",
      verseReference: "Gen.2.10-Gen.2.14",
      evidence: "上图：古代美索不达米亚平原。",
      confidence: "low",
    },
  ],
  [
    "p008_img007_1893x2778.png",
    {
      title: "《创世记》时期的近东世界",
      summary: "约主前 2000 年的古代近东地图，标出埃及、亚述、巴比伦、以拦等与《创世记》背景相关的地区。",
      verseReference: "创世记导论",
      evidence: "图注说明《创世记》描述从文明发端到雅各全家迁居埃及期间，古代近东各地发生的事件。",
      confidence: "high",
    },
  ],
  [
    "p220_img124_720x405.png",
    {
      title: "牛腿刀（Khopesh）",
      summary: "耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米，主前 2500-1300 年在埃及和迦南地流行；早期用青铜制作，后期用铁制作。牛腿刀形状像牛腿，适合劈砍，是埃及中王国和新王国时期军队的标志性装备，以色列人征服迦南时也使用这种刀。",
      body: "耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米，主前 2500-1300 年在埃及和迦南地流行；早期用青铜制作，后期用铁制作。牛腿刀形状像牛腿，适合劈砍，是埃及中王国和新王国时期军队的标志性装备，以色列人征服迦南时也使用这种刀。",
      verseReference: "Gen.22.10",
      evidence: "上图：耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米，主前 2500-1300 年在埃及和迦南地流行；早期用青铜制作，后期用铁制作。牛腿刀形状像牛腿，适合劈砍，是埃及中王国和新王国时期军队的标志性装备，以色列人征服迦南时也使用这种刀。",
      confidence: "high",
    },
  ],
  [
    "p033_img023_720x404.png",
    {
      title: "水桶兰的授粉过程",
      summary: "产于热带美洲的「水桶兰」（Bucket Orchid）有非常独特的花粉传播和授精机制。",
      verseReference: "Gen.1.22",
      evidence: "水桶兰复杂而精细的结构包括至少五项独立功能，并且必须按正确的次序运作：1、吸引蜜蜂；2、使蜜蜂掉进水桶；3、植物腺分泌液体注满水桶；4、提供隧道出口；5、在隧道内黏贴或除去花粉囊。",
      confidence: "high",
    },
  ],
  [
    "p280_img151_1000x654.png",
    {
      title: "风茄（Mandrake）",
      summary: "风茄（Mandrake）是一种多年生茄参属植物，根部像人，产于地中海周围地区，在收割小麦时成熟。",
      verseReference: "Gen.30.14-Gen.30.16",
      evidence: "上图：风茄（Mandrake）是一种多年生茄参属植物，根部像人，产于地中海周围地区，在收割小麦时成熟。在中东文化中认为它有帮助受孕的作用。",
      searchText: "风茄（Mandrake） 风茄 根部像人 Gen.30.14-Gen.30.16 创三十 14 创三十 15 创三十 16 流便寻见风茄 拉结 利亚 受孕",
      confidence: "high",
    },
  ],
  [
    "p014_img013_1888x2777.png",
    {
      title: "伊甸园位置示意图",
      summary: "《创世记》记载伊甸园位于四条河的汇合点，其中底格里斯河和幼发拉底河可与美索不达米亚相关联。",
      verseReference: "Gen.2.10-Gen.2.14",
      evidence: "图示根据四条河的线索标出伊甸园可能位于两河流域北端或南端。",
      searchText: "伊甸园 四条河 比逊河 基训河 底格里斯河 幼发拉底河 美索不达米亚 Gen.2.10 Gen.2.14",
      confidence: "high",
    },
  ],
  [
    "p397_img217_720x891.png",
    {
      title: "雅各生平行踪",
      summary: "雅各生平行踪：逃往哈兰，在哈兰娶妻生子；携眷返迦南；以扫从西珥来和雅各相会；迁往疏割、示剑、伯特利和希伯仑；全家迁往埃及，住在歌珊地。",
      verseReference: "Gen.27.43-Gen.29.1；Gen.31.3-Gen.32.1；Gen.33.1-Gen.33.16；Gen.33.17-Gen.35.27；Gen.46.1-Gen.46.7；Gen.47.11-Gen.47.12",
      evidence: "上图：雅各生平行踪。",
      confidence: "high",
    },
  ],
  [
    "p420_img231_692x901.png",
    {
      title: "约瑟、犹大生平行踪",
      summary: "约瑟、犹大生平行踪：约瑟被差遣到示剑去查看他的兄长们牧羊，在多坍被丢在坑里；约瑟被他的兄长卖给米甸人，带去埃及为奴；犹大的故事；约瑟接雅各全家到埃及，并将雅各的遗体运回希伯伦。",
      verseReference: "Gen.37.13；Gen.37.25-Gen.37.36；Gen.38.1-Gen.38.30；Gen.46.1-Gen.47.12；Gen.50.7-Gen.50.14",
      evidence: "图注续列：约瑟接父亲雅各全家到埃及；约瑟将雅各的遗体运回希伯伦。",
      confidence: "high",
    },
  ],
  [
    "p131_img072_573x349.png",
    {
      title: "欧洲议会大厦",
      summary: "欧洲议会大厦位于法国斯特拉斯堡，来源图注说明其设计参照勃鲁盖尔《巴别塔》。",
      verseReference: "Gen.11.4",
      evidence: "上图：欧洲议会大厦，根据 Pieter Bruegel 的名画《巴别塔 The Tower of Babel》设计而成，位于法国斯特拉斯堡。",
      confidence: "low",
    },
  ],
  [
    "p140_img077_720x314.png",
    {
      title: "吾珥城月神塔庙",
      summary: "吾珥城的月神塔庙是一座两层高的砖建筑，下层用沥青结合，上层用灰胶结合，来源图注说明它基本保存并已复原。",
      verseReference: "Gen.11.28-Gen.11.29",
      evidence: "上图：吾珥城的月神塔庙（Ziggurat），是一座两层高的砖建筑。",
      confidence: "low",
    },
  ],
  [
    "p140_img078_750x1231.png",
    {
      title: "吾珥城月神塔庙",
      summary: "吾珥是苏美尔人敬拜月神辛的中心；来源图注说明吾珥第三王朝时期兴建神庙，使吾珥进入繁荣时期。",
      verseReference: "Gen.11.31",
      evidence: "上图：吾珥城的月神塔庙（Ziggurat），是吾珥敬拜月神辛的中心。",
      confidence: "low",
    },
  ],
  [
    "p179_img105_720x989.png",
    {
      title: "庇耳·拉海·莱井",
      summary: "庇耳·拉海·莱位于加低斯和巴列中间，来源段落把它与夏甲称耶和华为看顾人的神相连。",
      verseReference: "Gen.16.13-Gen.16.14",
      evidence: "【14】「所以这井名叫庇耳·拉海·莱。这井正在加低斯和巴列中间。」",
      confidence: "low",
    },
  ],
  [
    "p207_img118_720x723.png",
    {
      title: "亚伯拉罕生平行踪",
      summary: "地图列出亚伯拉罕从吾珥经哈兰到迦南、在示剑和伯特利之间活动、因饥荒下埃及又回南地、与罗得分离后住在希伯仑，并迁往基拉耳等行踪。",
      verseReference: "Gen.12.5-Gen.20.18",
      evidence: "上图：亚伯拉罕生平行踪。",
      confidence: "low",
    },
  ],
  [
    "p253_img138_955x357.png",
    {
      title: "别是巴骑兵冲锋",
      summary: "1917 年 10 月 31 日，英军澳大利亚轻骑兵旅从东面突袭并占领别是巴，大部分水井未被毁坏。",
      verseReference: "Gen.26.23-Gen.26.25",
      evidence: "上图：1917 年 10 月 31 日，英军澳大利亚轻骑兵旅绕道东面，发起史上最后一次成功的骑兵冲锋。",
      confidence: "low",
    },
  ],
  [
    "p253_img139_720x269.png",
    {
      title: "别是巴骑兵冲锋纪念邮票",
      summary: "2017 年，澳大利亚和以色列联合发行邮票，纪念别是巴骑兵冲锋 100 周年。",
      verseReference: "Gen.26.23-Gen.26.25",
      evidence: "上图：2017 年，澳大利亚和以色列联合发行邮票，纪念传奇式的别是巴骑兵冲锋 100 周年。",
      confidence: "low",
    },
  ],
  [
    "p332_img180_720x772.png",
    {
      title: "以扫后裔居住地",
      summary: "地图标示以扫及其后裔以东人、亚玛力人和米甸人的居住地。",
      verseReference: "Gen.36.1-Gen.36.43",
      evidence: "上图：以扫及其后裔以东人、亚玛力人和米甸人的居住地。",
      confidence: "low",
    },
  ],
  [
    "p142_img079_720x655.png",
    {
      title: "吾珥军旗两侧图案",
      summary: "吾珥出土的「吾珥军旗」两侧镶嵌战争、胜利、和平和宴会场景，显示亚伯拉罕出生前数百年的吾珥已有高度物质文明和艺术水平。",
      verseReference: "Gen.11.31",
      evidence: "上图：「吾珥军旗 The Standard of Ur」两侧的图案。",
      confidence: "low",
    },
  ],
  [
    "p156_img090_701x1024.png",
    {
      title: "族长们在应许之地的行踪",
      summary: "地图呈现族长们在应许之地的行踪。",
      verseReference: "Gen.12.4-Gen.13.18",
      evidence: "上图：族长们在应许之地的行踪。",
      confidence: "low",
    },
  ],
  [
    "p024_img023_1891x2777.png",
    {
      title: "各族列国分布图",
      summary: "创世记 10 章所载族群分布图，概括含、闪、雅弗后代在北非、地中海东岸、美索不达米亚、阿拉伯半岛、欧洲和小亚细亚等地区的分布。",
      verseReference: "Gen.10.1-Gen.10.32",
      evidence: "图注说明创世记 10 章许多族群身份相对明确，并按含、闪、雅弗后代标示其大致分布。",
      searchText: "各族列国分布图 含 闪 雅弗 创世记10章 Gen.10.1 Gen.10.32 北非 地中海东岸 美索不达米亚",
      confidence: "high",
    },
  ],
  [
    "p027_img026_1890x2774.png",
    {
      title: "金字形庙塔",
      summary: "金字形庙塔是古代美索不达米亚地区的巨大神庙，一般认为《创世记》记载的巴别塔属于此类建筑。",
      verseReference: "Gen.11.1-Gen.11.9",
      evidence: "图注说明这种塔以泥草砖和柏油建造，塔顶有小型庙宇或神龛，下图描绘吾珥的南娜庙塔。",
      searchText: "金字形庙塔 巴别塔 美索不达米亚 吾珥 南娜庙塔 Gen.11.1 Gen.11.9",
      confidence: "high",
    },
  ],
  [
    "p028_img027_1889x2777.png",
    {
      title: "吾珥古城",
      summary: "吾珥是亚伯拉罕的出生地，图中标示幼发拉底河、南娜庙塔、王宫、陵墓和居住区等古城布局。",
      verseReference: "Gen.11.27-Gen.11.32",
      evidence: "图注说明吾珥位于今巴格达东南约 300 公里，亚伯拉罕应熟悉图示的第三王朝时期吾珥。",
      searchText: "吾珥古城 亚伯拉罕 他拉 幼发拉底河 南娜庙塔 Gen.11.27 Gen.11.32",
      confidence: "high",
    },
  ],
  [
    "p029_img028_1890x2774.png",
    {
      title: "亚伯兰前往迦南",
      summary: "地图呈现亚伯兰从吾珥经哈兰前往迦南的路线，并标出他拉和亚伯兰前往哈兰、亚伯兰前往迦南的路径。",
      verseReference: "Gen.12.1-Gen.12.9",
      evidence: "图注说明他拉带全家前往迦南后定居哈兰，耶和华随后吩咐亚伯兰往所指示的地去。",
      confidence: "high",
    },
  ],
  [
    "p032_img031_1889x2777.png",
    {
      title: "西订谷之战",
      summary: "迦南五城反叛美索不达米亚四王，战事导致罗得被掳，亚伯兰随后追击四王并救回罗得。",
      verseReference: "Gen.14.1-Gen.14.16",
      evidence: "图注说明四王进攻、返回和亚伯兰追赶四王的路线，并标出联盟背叛城邑和战场。",
      confidence: "high",
    },
  ],
  [
    "p038_img037_1891x2777.png",
    {
      title: "所多玛和蛾摩拉",
      summary: "地图标出所多玛、蛾摩拉及邻近城邑，配合亚伯拉罕代求、罗得获救和所多玛灭亡的叙事。",
      verseReference: "Gen.18.20-Gen.19.29",
      evidence: "图注说明因亚伯拉罕的祈求，耶和华拯救罗得一家，使他们不与所多玛和蛾摩拉一同灭亡。",
      confidence: "medium",
    },
  ],
  [
    "p045_img044_1890x2771.png",
    {
      title: "往巴旦亚兰之旅",
      summary: "地图呈现亚伯拉罕仆人前往巴旦亚兰为以撒寻妻，并把利百加带回迦南的路线。",
      verseReference: "Gen.24.10-Gen.24.67",
      evidence: "图注说明亚伯拉罕派老仆人回本族之地为以撒娶妻，老仆人找到利百加并把她带回迦南。",
      confidence: "high",
    },
  ],
  [
    "p058_img057_1886x2774.png",
    {
      title: "雅各返回迦南",
      summary: "地图呈现雅各从巴旦亚兰返回迦南，经过玛哈念、雅博渡口和毗努伊勒，并与以扫相会后的路线。",
      verseReference: "Gen.31.3-Gen.33.17",
      evidence: "图注说明雅各带着家人和财富返回迦南，在雅博渡口摔跤，后来与以扫和好。",
      confidence: "high",
    },
  ],
  [
    "p066_img065_1882x2774.png",
    {
      title: "约瑟和他的哥哥们",
      summary: "地图呈现约瑟从希伯仑到示剑、多坍寻找哥哥，以及以实玛利商人将他带往埃及的路线。",
      verseReference: "Gen.37.12-Gen.37.36",
      evidence: "图注说明雅各打发约瑟寻找哥哥们，约瑟在多坍找到他们后被丢在坑里，又被卖给前往埃及的商人。",
      confidence: "high",
    },
  ],
  [
    "p069_img068_1886x2772.png",
    {
      title: "约瑟时期的埃及",
      summary: "地图标示约瑟被带到埃及时埃及第十二王朝的地域、尼罗河流域和周边地点。",
      verseReference: "Gen.39.1-Gen.39.6",
      evidence: "图注说明约瑟被带到埃及时，埃及势力强盛，尼罗河定期泛滥带来稳定粮食供应。",
      confidence: "high",
    },
  ],
  [
    "p011_img001_661x631.png",
    {
      title: "希伯来文创世记残片",
      summary: "主前 1 世纪希伯来文创世记 1:1-8 羊皮卷残片的红外照片。",
      verseReference: "Gen.1.1-Gen.1.8",
      evidence: "上图：主前 1 世纪的希伯来文创世记第一章 1-8 节羊皮卷残片红外照片。",
      confidence: "low",
    },
  ],
  [
    "p015_img003_435x262.png",
    {
      title: "2701 与三角数分解",
      summary: "创世记 1:1 希伯来字母数值之和 2701，可分解为 37 x 73，并与三角数结构相关。",
      verseReference: "Gen.1.1",
      evidence: "图示说明 2701、28 与三角数之间的关系。",
      confidence: "low",
    },
  ],
  [
    "p015_img004_553x426.png",
    {
      title: "2701 的三角数图示",
      summary: "2701 被呈现为第 73 个三角数，28 被呈现为第 7 个三角数。",
      verseReference: "Gen.1.1",
      evidence: "上图：2701 与 28 的三角数排列。",
      confidence: "low",
    },
  ],
  [
    "p016_img005_720x635.png",
    {
      title: "创世记 1:1 的三角形排列",
      summary: "创世记 1:1 的希伯来字母被排列成多个三角形，显示经文数字结构。",
      verseReference: "Gen.1.1",
      evidence: "上图：第 1 节希伯来字母的三角形排列。",
      confidence: "low",
    },
  ],
  [
    "p016_img006_389x258.png",
    {
      title: "37 与 73 的大卫星数",
      summary: "创世记 1:1 字母数值之和 2701 等于 37 x 73，图中以大卫星数展示其结构。",
      verseReference: "Gen.1.1",
      evidence: "上图：37 与 73 组成的大卫星数图示。",
      confidence: "low",
    },
  ],
  [
    "p017_img007_599x361.png",
    {
      title: "37 与 73 的组合图示",
      summary: "37 与 73 分别作为大卫星数，并在图中组合成对应的圆点结构。",
      verseReference: "Gen.1.1",
      evidence: "上图：37 与 73 的大卫星数组合。",
      confidence: "high",
    },
  ],
  [
    "p017_img008_717x405.png",
    {
      title: "以色列国旗上的大卫星",
      summary: "大卫星作为犹太文化标志，被放在以色列国旗上。",
      verseReference: "Gen.1.1",
      evidence: "上图：以色列国旗上的大卫星。",
      confidence: "high",
    },
  ],
  [
    "p020_img010_725x335.png",
    {
      title: "太阳系恒星宜居带",
      summary: "绿色区域标示太阳系中的恒星宜居带范围，与昼夜温度和植物光合作用有关。",
      verseReference: "Gen.1.5",
      evidence: "上图：天文学家圈定的太阳系恒星宜居带。",
      confidence: "low",
    },
  ],
  [
    "p021_img011_720x574.png",
    {
      title: "金星、地球、火星磁场对比",
      summary: "从上到下分别是金星、地球、火星的磁场对比，说明地球维持大气层和水环境所需的条件。",
      verseReference: "Gen.1.6",
      evidence: "上图：从上到下分别是金星、地球、火星的磁场对比。",
      confidence: "high",
    },
  ],
  [
    "p023_img012_720x720.png",
    {
      title: "没有海水覆盖的地球",
      summary: "蓝色立方块代表地球上所有水的体积；若没有地质运动抬高大陆，海水总量将覆盖地球表面约 2.7 公里深。",
      verseReference: "Gen.1.10",
      evidence: "上图：地球上没有水的样子。蓝色立方块代表地球上所有水的体积。",
      confidence: "medium",
    },
  ],
  [
    "p023_img013_720x720.png",
    {
      title: "地球水量体积示意",
      summary: "蓝色立方块代表地球上所有水的体积；若没有地质运动抬高大陆，海水总量将覆盖地球表面约 2.7 公里深。",
      verseReference: "Gen.1.10",
      evidence: "上图：地球上没有水的样子。蓝色立方块代表地球上所有水的体积。",
      confidence: "medium",
    },
  ],
  [
    "p024_img014_400x500.png",
    {
      title: "阿波罗 8 号诵读创世记",
      summary: "阿波罗 8 号航天员在任务结束时诵读创世记开头经文并向地球致意。",
      verseReference: "Gen.1.1-Gen.1.10",
      evidence: "图中记录阿波罗 8 号任务与创世记经文诵读的关联。",
      confidence: "low",
    },
  ],
  [
    "p030_img019_629x550.png",
    {
      title: "太阳与各大行星比例",
      summary: "太阳的大小、年龄和元素条件会影响太阳系环境是否适合地球生命。",
      verseReference: "Gen.1.14-Gen.1.19",
      evidence: "上图：太阳与各大行星的比例。",
      confidence: "low",
    },
  ],
  [
    "p031_img020_720x383.png",
    {
      title: "地球转轴倾角与四季",
      summary: "地球约 23.5 度的转轴倾角带来稳定季节变化，月球则有助于维持这种倾角。",
      verseReference: "Gen.1.14-Gen.1.19",
      evidence: "上图：地球转轴倾角导致四季变化。",
      confidence: "low",
    },
  ],
  [
    "p031_img021_600x323.png",
    {
      title: "月球与海洋潮汐",
      summary: "月球带来的潮汐运动使海水持续流动，也与地球环境的稳定有关。",
      verseReference: "Gen.1.14-Gen.1.19",
      evidence: "图示说明月球潮汐与地球环境的关系。",
      confidence: "low",
    },
  ],
  [
    "p040_img026_720x848.png",
    {
      title: "法国共和历",
      summary: "法国大革命时期启用的共和历试图改变七日一周的节律。",
      verseReference: "Gen.2.1-Gen.2.3",
      evidence: "上图：法国共和历。",
      confidence: "low",
    },
  ],
  [
    "p041_img027_720x525.png",
    {
      title: "苏维埃五日周历法",
      summary: "苏联曾实施五日周历法，试图改变传统七日一周的生活节律。",
      verseReference: "Gen.2.1-Gen.2.3",
      evidence: "上图：一周五天的苏维埃历法。",
      confidence: "low",
    },
  ],
  [
    "p043_img029_720x511.png",
    {
      title: "四字神名 YHWH",
      summary: "四字神名原文由四个希伯来辅音组成，后来的读音传统与元音标注有关。",
      verseReference: "Gen.2.4",
      evidence: "上图：「耶和华」读音的由来。",
      confidence: "low",
    },
  ],
  [
    "p063_img035_650x465.png",
    {
      title: "古代四足蛇化石",
      summary: "巴西发现的四足蛇化石呈现蛇类身体结构与腿部痕迹的讨论。",
      verseReference: "Gen.3.14",
      evidence: "上图：巴西发现的古代四足蛇化石。",
      confidence: "low",
    },
  ],
  [
    "p063_img036_600x318.png",
    {
      title: "蛇的犁鼻器",
      summary: "蛇用分叉舌头收集气味分子，再送入口腔顶部的犁鼻器进行感知。",
      verseReference: "Gen.3.14",
      evidence: "上图：蛇口腔顶部的犁鼻器。",
      confidence: "low",
    },
  ],
  [
    "p067_img038_720x480.png",
    {
      title: "荆棘中的长颈鹿",
      summary: "东非长颈鹿能在长满荆棘的皂荚树上取食，显示荆棘在受造界中的实际作用。",
      verseReference: "Gen.3.18",
      evidence: "上图：东非长颈鹿在皂荚树上取食。",
      confidence: "low",
    },
  ],
  [
    "p067_img039_720x480.png",
    {
      title: "荆棘中的黑脸猴",
      summary: "东非黑脸猴能在荆棘中藏身、觅食，显示荆棘也可成为动物栖身之处。",
      verseReference: "Gen.3.18",
      evidence: "上图：东非黑脸猴在荆棘中藏身、觅食。",
      confidence: "low",
    },
  ],
  [
    "p077_img043_720x540.png",
    {
      title: "埃利都遗址",
      summary: "埃利都是目前发现的美索不达米亚最早城市之一，古代城市的创建与贸易、文化、宗教和政治中心形成密切相关。",
      verseReference: "Gen.4.17",
      evidence: "上图：主前 5400 年的埃利都遗址。埃利都是目前发现的美索不达米亚最早的城市，也是世界上最早的城市。",
      searchText: "埃利都 Eridu 该隐 建城 以诺城 Gen.4.17",
      confidence: "high",
    },
  ],
  [
    "p079_img044_716x1023.png",
    {
      title: "王后的里拉琴",
      summary: "主前 2600 年的「王后的里拉琴」出土于吾珥，说明古代近东很早已有琴、瑟、笛等乐器。",
      verseReference: "Gen.4.21",
      evidence: "上图：主前 2600 年的「王后的里拉琴」，出于亚伯拉罕的老家吾珥，现藏于大英博物馆。",
      searchText: "王后的里拉琴 Queen's Lyre 吾珥 犹八 音乐 Gen.4.21",
      confidence: "high",
    },
  ],
  [
    "p080_img045_720x466.png",
    {
      title: "图坦卡蒙陨石铁短剑",
      summary: "图坦卡蒙墓中出土的陨石铁短剑，用来说明古埃及人在铁器时代以前已使用陨石铁。",
      verseReference: "Gen.4.22",
      evidence: "上图：从主前 14 世纪埃及法老图坦卡蒙墓中出土的陨石铁短剑。",
      confidence: "high",
    },
  ],
  [
    "p085_img046_720x773.png",
    {
      title: "染色体端粒和端粒酶",
      summary: "端粒和端粒酶与细胞分裂次数、人体寿命限制有关，来源段落用它解释洪水前后寿命差异。",
      verseReference: "Gen.5.27",
      evidence: "上图：染色体端粒和端粒酶。",
      confidence: "high",
    },
  ],
  [
    "p087_img047_618x1024.png",
    {
      title: "《苏美尔王表》立柱",
      summary: "韦尔德-布伦德尔立柱刻有《苏美尔王表》，来源段落用它对照洪水前后寿命传统。",
      verseReference: "Gen.5.27",
      evidence: "下图：主前 2000-1800 年的韦尔德-布伦德尔立柱，上面用楔形文字刻有《苏美尔王表》。",
      confidence: "high",
    },
  ],
  [
    "p104_img055_723x367.png",
    {
      title: "希伯来历法",
      summary: "希伯来历法源于苏美尔尼普尔历法，来源段落用它解释方舟停在亚拉腊山上的日期。",
      verseReference: "Gen.8.4",
      evidence: "上图：希伯来历法，源于苏美尔尼普尔历法。",
      confidence: "high",
    },
  ],
  [
    "p104_img056_600x447.png",
    {
      title: "亚拉腊日期与历法说明",
      summary: "希伯来历法源于苏美尔尼普尔历法，来源段落用它解释方舟停在亚拉腊山上的日期。",
      verseReference: "Gen.8.4",
      evidence: "上图：希伯来历法，源于苏美尔尼普尔历法。",
      confidence: "high",
    },
  ],
  [
    "p111_img060_600x399.png",
    {
      title: "描绘犹太人屠宰的中世纪绘画",
      summary: "犹太人的肉食必须把血放干净，图像说明血与生命的经文背景。",
      verseReference: "Gen.9.4",
      evidence: "上图：描绘犹太人屠宰的中世纪绘画。犹太人的肉食必须把血放干净。",
      confidence: "high",
    },
  ],
  [
    "p114_img061_720x353.png",
    {
      title: "早期酿酒和橄榄种植遗迹",
      summary: "图中标出新石器时代、红铜时代和青铜时代早期酿酒与橄榄种植遗迹，用来说明葡萄酒与农业历史的关系。",
      verseReference: "Gen.9.20",
      evidence: "上图：发现新石器时代、红铜时代和青铜时代早期酿酒和橄榄种植遗迹的考古地点。",
      searchText: "挪亚 葡萄园 酿酒 橄榄种植 Gen.9.20",
      confidence: "high",
    },
  ],
  [
    "p127_img069_1445x1019.png",
    {
      title: "挪亚的后代分布图",
      summary: "挪亚后代分布图展示雅弗、含、闪后代各族的领土与宁录所建之城。",
      verseReference: "Gen.10.1-Gen.10.32",
      evidence: "上图：挪亚的后代分布图。",
      searchText: "挪亚后代 分布 雅弗 含 闪 宁录 列国 Gen.10",
      confidence: "high",
    },
  ],
  [
    "p122_img065_720x464.png",
    {
      title: "亚述拉玛苏",
      summary: "亚述纳西拔二世王宫入口的半人半兽怪物拉玛苏，位于当时亚述首都宁录，作为宁录所建城邑和亚述扩张的背景。",
      verseReference: "Gen.10.11-Gen.10.12",
      evidence: "上图：亚述纳西拔二世王宫入口的半人半兽怪物拉玛苏，位于当时的亚述首都宁录。",
      searchText: "亚述 拉玛苏 宁录 尼尼微 迦拉 利鲜 Gen.10.11 Gen.10.12",
      confidence: "high",
    },
  ],
  [
    "p160_img093_720x540.png",
    {
      title: "希伯仑山南面",
      summary: "希伯仑山南面的景象，与亚伯兰纵横走遍应许之地、迁到希伯仑的经文相连。",
      verseReference: "Gen.13.17-Gen.13.18",
      evidence: "上图：希伯仑山的南面。",
      confidence: "high",
    },
  ],
  [
    "p200_img116_720x439.png",
    {
      title: "罗得、摩押和亚扪行踪",
      summary: "地图呈现罗得从伯特利附近迁向约旦河平原、所多玛与琐珥山地，以及摩押、亚扪相关地区。",
      verseReference: "Gen.13.5-Gen.19.38",
      evidence: "图像标出罗得离开亚伯兰后的迁徙及摩押、亚扪背景地点。",
      confidence: "medium",
    },
  ],
  [
    "p212_img120_720x989.png",
    {
      title: "夏甲和以实玛利行踪",
      summary: "夏甲和以实玛利行踪：夏甲怀孕后出走又回到亚伯兰家，后来与以实玛利被逐，在别是巴旷野蒙神看顾后去到巴兰旷野。",
      verseReference: "Gen.16.1-Gen.16.16；Gen.21.14-Gen.21.21",
      evidence: "上图：夏甲和以实玛利行踪。",
      confidence: "high",
    },
  ],
  [
    "p216_img123_1060x1591.png",
    {
      title: "别是巴的柽柳树",
      summary: "柽柳树耐干旱、耐水湿、耐盐碱，旷野中的贝都因人也会收集树叶喂养牲畜。",
      verseReference: "Gen.21.33-Gen.21.34",
      evidence: "上图：一位贝都因游牧民族的女孩正从柽柳树上收集树叶喂山羊；上图：别是巴遗址的柽柳树。",
      confidence: "high",
    },
  ],
  [
    "p255_img142_720x540.png",
    {
      title: "别是巴公共水井",
      summary: "别是巴遗址城门口的公共水井深约 70 米，是南地已发现最深的水井，可能就是以撒所挖的井。",
      verseReference: "Gen.26.33",
      evidence: "上图：别是巴遗址城门口的公共水井，深 70 米，是在南地已发现最深的水井。",
      confidence: "high",
    },
  ],
  [
    "p256_img143_720x626.png",
    {
      title: "以撒生平行踪",
      summary: "地图标示以撒在基拉耳、利河伯、别是巴等地的行踪。",
      verseReference: "Gen.26.1-Gen.26.35",
      evidence: "图中标示以撒在非利士地、基拉耳、利河伯和别是巴一带的行踪。",
      confidence: "low",
    },
  ],
  [
    "p263_img145_720x483.png",
    {
      title: "西珥山地",
      summary: "西珥山地位于死海南部，是以扫后裔以东人的主要居住地。",
      verseReference: "Gen.27.39-Gen.27.40",
      evidence: "图像展示以东相关的山地环境，呼应以扫所得的祝福和后裔处境。",
      confidence: "medium",
    },
  ],
  [
    "p268_img146_411x669.png",
    {
      title: "雅各逃往哈兰路线",
      summary: "地图标示雅各从别是巴出发，经过伯特利，往哈兰去的路线。",
      verseReference: "Gen.28.10-Gen.28.11",
      evidence: "图中路线与雅各离开别是巴、向哈兰去的叙事相连。",
      confidence: "high",
    },
  ],
  [
    "p273_img149_720x510.png",
    {
      title: "哈兰蜂巢房外观",
      summary: "哈兰地区传统蜂巢形房屋，展示雅各到达东方人之地后的生活背景。",
      verseReference: "Gen.29.1",
      evidence: "图像展示哈兰地区常见的蜂巢形房屋外观。",
      confidence: "medium",
    },
  ],
  [
    "p303_img163_504x342.png",
    {
      title: "开封教经胡同",
      summary: "开封犹太人后裔居住的教经胡同，与不吃大腿窝筋的传统背景相关。",
      verseReference: "Gen.32.32",
      evidence: "图像展示开封教经胡同相关地点，呼应以色列人不吃大腿窝筋的习俗。",
      confidence: "medium",
    },
  ],
  [
    "p311_img169_703x800.png",
    {
      title: "迦南女子项链",
      summary: "主前 1400-1200 年迦南女子项链，中间金坠刻有埃及爱神哈索尔形象。",
      verseReference: "Gen.34.2",
      evidence: "图像展示迦南女子项链，作为底拿进入示剑环境的文化背景。",
      confidence: "high",
    },
  ],
  [
    "p318_img171_413x478.png",
    {
      title: "迦南耳环饰物",
      summary: "耳环可能刻着偶像或护身符图案，图像呼应雅各吩咐家人除掉外邦神像和耳环。",
      verseReference: "Gen.35.4",
      evidence: "图像展示与外邦神像和耳环背景相关的饰物。",
      confidence: "medium",
    },
  ],
  [
    "p318_img172_720x478.png",
    {
      title: "示剑橡树",
      summary: "示剑一带的橡树场景，呼应雅各把外邦神像和耳环藏在示剑橡树底下。",
      verseReference: "Gen.35.4",
      evidence: "图像展示示剑地区橡树，作为藏埋外邦神像和耳环的地理背景。",
      confidence: "medium",
    },
  ],
  [
    "p323_img175_720x527.png",
    {
      title: "拉结墓",
      summary: "拉结墓位于伯利恒附近，呼应拉结死后葬在以法他的路旁。",
      verseReference: "Gen.35.19-Gen.35.20",
      evidence: "图像展示拉结墓相关地点。",
      confidence: "medium",
    },
  ],
  [
    "p352_img190_439x353.png",
    {
      title: "古埃及葡萄园壁画",
      summary: "古埃及葡萄园壁画呈现葡萄采收与酿酒场景，呼应酒政梦中的葡萄树和酒杯。",
      verseReference: "Gen.40.9-Gen.40.11",
      evidence: "图像展示古埃及葡萄采收或酿酒相关场景。",
      confidence: "medium",
    },
  ],
  [
    "p361_img197_334x314.png",
    {
      title: "霍朗赫布戒指",
      summary: "古埃及法老霍朗赫布的打印戒指，可用来理解法老把戒指戴在约瑟手上的任命象征。",
      verseReference: "Gen.41.42",
      evidence: "上图：古埃及第十八王朝末代法老霍朗赫布的打印戒指。",
      confidence: "high",
    },
  ],
  [
    "p361_img198_224x367.png",
    {
      title: "Sennefer 金链与细麻衣",
      summary: "古埃及贵族 Sennefer 穿戴细麻衣和金链，可用来理解约瑟被授予细麻衣和金链的背景。",
      verseReference: "Gen.41.42",
      evidence: "上图：古埃及第十八王朝贵族 Sennefer 穿戴的细麻衣和金链。",
      confidence: "high",
    },
  ],
  [
    "p363_img200_223x424.png",
    {
      title: "辛努塞尔特三世像",
      summary: "古埃及第十二王朝法老辛努塞尔特三世像，作为约瑟治理埃及时期的历史背景。",
      verseReference: "Gen.41.46",
      evidence: "上图：古埃及第十二王朝法老辛努塞尔特三世像。",
      confidence: "high",
    },
  ],
  [
    "p366_img202_720x290.png",
    {
      title: "外国人向埃及官员进见",
      summary: "卡纳克神庙砂岩画中，一群外国人向古埃及官员进见。",
      verseReference: "Gen.42.6",
      evidence: "图像中的外国人进见埃及权贵，呼应约瑟哥哥们到埃及向约瑟下拜。",
      confidence: "high",
    },
  ],
  [
    "p381_img208_498x354.png",
    {
      title: "今日尼罗河三角洲",
      summary: "今日尼罗河三角洲土地肥沃，适合放牧，常被视为歌珊地背景。",
      verseReference: "Gen.45.10",
      evidence: "上图：今日尼罗河三角洲。",
      confidence: "medium",
    },
  ],
  [
    "p381_img209_720x712.png",
    {
      title: "今日尼罗河三角洲",
      summary: "今日尼罗河三角洲土地肥沃，适合放牧，常被视为歌珊地背景。",
      verseReference: "Gen.45.10",
      evidence: "上图：今日尼罗河三角洲。",
      confidence: "medium",
    },
  ],
  [
    "p405_img221_720x599.png",
    {
      title: "以色列十二支派标志",
      summary: "现代设计中的以色列十二支派标志，以图像方式对应雅各给众子的祝福。",
      verseReference: "Gen.49.1-Gen.49.28",
      evidence: "图像展示十二支派标志，呼应雅各聚集众子并宣告祝福。",
      confidence: "high",
    },
  ],
  [
    "p411_img226_600x600.png",
    {
      title: "约瑟支派相关徽记",
      summary: "徽记图像可能用于说明约瑟后裔或以法莲、玛拿西相关象征。",
      verseReference: "Gen.49.22",
      evidence: "图像与约瑟祝福段落相邻，但本页文字证据不足以确认具体对象。",
      confidence: "low",
    },
  ],
]);

const cmcAssets = import.meta.glob<string>(
  "../assets/resources/genesis/images/cmc-01/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

const codexV2CropAssets = import.meta.glob<string>(
  "../assets/resources/genesis/images/ohb-genesis-codex-v2-crops/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

const codexV2CropFileNamesByOriginal = new Map<string, string>([
  ["p008_img007_1893x2778.png", "p008_img007_880x900.png"],
  ["p014_img013_1888x2777.png", "p014_img013_840x820.png"],
  ["p024_img023_1891x2777.png", "p024_img023_1615x1585.png"],
  ["p027_img026_1890x2774.png", "p027_img026_1540x880.png"],
  ["p028_img027_1889x2777.png", "p028_img027_760x1085.png"],
  ["p029_img028_1890x2774.png", "p029_img028_1035x850.png"],
  ["p032_img031_1889x2777.png", "p032_img031_990x2065.png"],
  ["p038_img037_1891x2777.png", "p038_img037_480x620.png"],
  ["p045_img044_1890x2771.png", "p045_img044_745x1120.png"],
  ["p058_img057_1886x2774.png", "p058_img057_1030x1490.png"],
  ["p066_img065_1882x2774.png", "p066_img065_805x1070.png"],
  ["p069_img068_1886x2772.png", "p069_img068_1015x1450.png"],
]);

function fileNameFromPath(path: string) {
  const pathParts = path.split("/");
  return pathParts[pathParts.length - 1] ?? path;
}

function assetPathForFileName(assetModules: Record<string, string>, fileName: string) {
  const entry = Object.entries(assetModules).find(([path]) => fileNameFromPath(path) === fileName);
  return entry?.[1];
}

function fileStem(fileName: string) {
  return fileName.replace(/\.png$/i, "");
}

function sourceFolderFromStoredRelativePath(storedRelativePath: string) {
  return storedRelativePath.split("/")[0] || undefined;
}

function resourceSlug(fileName: string) {
  return fileStem(fileName).replace(/_/g, "-").toLowerCase();
}

function pageFromFileName(fileName: string) {
  const match = fileName.match(/^p(\d+)_/);
  return match ? Number(match[1]) : 1;
}

function compareVerseIds(left: VerseId, right: VerseId) {
  const leftVerse = parseVerseId(left);
  const rightVerse = parseVerseId(right);
  if (leftVerse.book !== rightVerse.book) {
    return leftVerse.book.localeCompare(rightVerse.book);
  }
  if (leftVerse.chapter !== rightVerse.chapter) {
    return leftVerse.chapter - rightVerse.chapter;
  }
  return leftVerse.verse - rightVerse.verse;
}

function expandGenesisVerseRange(start: VerseId, end: VerseId = start): VerseId[] {
  const parsedStart = parseVerseId(start);
  const parsedEnd = parseVerseId(end);
  if (parsedStart.book !== "Gen" || parsedEnd.book !== "Gen") {
    throw new Error(`Genesis resource placement must use Genesis verse ids: ${start}-${end}`);
  }
  if (compareVerseIds(start, end) > 0) {
    throw new Error(`Genesis resource placement range is reversed: ${start}-${end}`);
  }

  const verses: VerseId[] = [];
  for (let chapter = parsedStart.chapter; chapter <= parsedEnd.chapter; chapter += 1) {
    const chapterVerseCount = genesisVerseCounts[chapter - 1];
    if (!chapterVerseCount) {
      throw new Error(`Genesis resource placement uses unknown chapter: ${chapter}`);
    }

    const firstVerse = chapter === parsedStart.chapter ? parsedStart.verse : 1;
    const lastVerse = chapter === parsedEnd.chapter ? parsedEnd.verse : chapterVerseCount;
    if (firstVerse < 1 || lastVerse > chapterVerseCount) {
      throw new Error(`Genesis resource placement is outside chapter bounds: ${start}-${end}`);
    }

    for (let verse = firstVerse; verse <= lastVerse; verse += 1) {
      verses.push(verseIdFromParts("Gen", chapter, verse));
    }
  }

  return verses;
}

function uniqueVerseIds(verseIds: VerseId[]) {
  return Array.from(new Set(verseIds));
}

function versesForFileName(fileName: string): VerseId[] {
  const placement = genesisResourcePlacementByFilename.get(fileName);
  if (!placement) {
    throw new Error(`Missing Genesis resource placement for ${fileName}`);
  }
  if (placement.scope === "book-intro") {
    return [];
  }

  return uniqueVerseIds(placement.ranges.flatMap((range) => expandGenesisVerseRange(range.start, range.end)));
}

function primaryAnchorForFileName(fileName: string, verses: VerseId[]) {
  const placement = genesisResourcePlacementByFilename.get(fileName);
  if (!placement || placement.scope === "book-intro") {
    return undefined;
  }

  return placement.primaryAnchor ?? verses[0];
}

function placementSummary(fileName: string) {
  const placement = genesisResourcePlacementByFilename.get(fileName);
  if (!placement) {
    throw new Error(`Missing Genesis resource placement for ${fileName}`);
  }

  const rangeText = placement.ranges
    .map((range) => range.end && range.end !== range.start ? `${range.start}-${range.end}` : range.start)
    .join("；");
  const scopeText = placement.scope === "book-intro" ? "创世记导论" : rangeText;

  return { ...placement, scopeText };
}

function verseReferenceForPlacement(fileName: string) {
  const placement = placementSummary(fileName);
  if (placement.scope === "book-intro") {
    return "创世记导论";
  }

  return placement.ranges
    .map((range) => range.end && range.end !== range.start ? `${range.start}-${range.end}` : range.start)
    .join("；");
}

const machineEvidencePrefixPattern = /^(caption_exact_ref|front_matter_or_intro|ocr_page_ref|page_bracket_ref|physical_chapter_only|visual_caption_ref)\s*\/\s*[^；]*；?/;
const machineEvidenceTokenPattern = /(caption_exact_ref|front_matter_or_intro|ocr_page_ref|page_bracket_ref|physical_chapter_only|visual_caption_ref|physical_page_chapter:\d+)/g;
const localTraceTokenPattern = /\/Users\/simon\/\S+|[A-Za-z0-9_./-]+\.(?:png|pdf)|p\d{3}_img\d{3}_\d+x\d+|[a-f0-9]{64}/gi;
const chineseVerseMarkerPattern = /【创[一二三四五六七八九十廿卅四五六七八九零〇百\s\d]+】/;
const nonCaptionTitleStartPattern = /^(?:[•·]|【|「|『|创世记\s+\d+:\d+|\d{1,3}\s)/;
const clippedTitlePattern = /^[，。；：、？！,.;:]|[。，；]|\s[A-Za-z]{1,4}$|[A-Za-z]{1,4}$/;
const generatedTitleOverrideByFilename = new Map<string, string>([
  ["p024_img023_1891x2777.png", "各族列国分布图"],
  ["p029_img018_572x552.png", "泰坦星第一张照片"],
  ["p032_img031_1889x2777.png", "四王与五王之战"],
  ["p053_img033_720x378.png", "巴比伦创世史诗泥版"],
  ["p109_img059_720x480.png", "《吉尔伽美什史诗》泥板"],
  ["p122_img065_720x464.png", "亚述拉玛苏"],
  ["p045_img044_1890x2771.png", "利百加井旁接待仆人"],
  ["p069_img068_1886x2772.png", "约瑟拒绝主母"],
  ["p131_img071_720x527.png", "勃鲁盖尔《巴别塔》"],
  ["p131_img072_573x349.png", "欧洲议会大厦"],
  ["p149_img084_720x448.png", "应许之地交通位置"],
  ["p252_img137_604x414.png", "亚伯拉罕井旧照"],
  ["p319_img173_720x508.png", "示剑东面橡树"],
  ["p332_img180_720x772.png", "以东人居住地"],
  ["p338_img182_720x478.png", "多坍谷"],
  ["p347_img188_429x291.png", "古代近东商道"],
  ["p354_img191_448x409.png", "古埃及仆人木偶"],
  ["p361_img197_334x314.png", "霍朗赫布戒指"],
  ["p361_img198_224x367.png", "Sennefer 金链与细麻衣"],
  ["p362_img199_433x321.png", "图坦卡蒙战车壁画"],
  ["p371_img204_719x519.png", "古埃及浮雕上的驴"],
  ["p377_img207_300x257.png", "圣甲虫形戒指"],
  ["p388_img212_720x480.png", "图坦卡蒙金马车"],
  ["p393_img215_580x330.png", "尼罗河定期泛滥"],
  ["p402_img220_720x534.png", "玛拿西支派后裔士兵"],
  ["p234_img130_580x535.png", "以色列金首饰"],
  ["p234_img131_609x770.png", "以色列金首饰"],
  ["p262_img144_600x736.png", "努斯石版"],
  ["p408_img224_720x446.png", "图坦卡蒙手持权杖"],
  ["p318_img171_413x478.png", "亚兰族谱印章"],
  ["p318_img172_720x478.png", "亚兰族谱印章"],
  ["p407_img222_539x767.png", "耶路撒冷市徽"],
]);

const nonReaderCardFileNames = new Set([
  "p165_img097_53x23.png",
  "p247_img135_211x23.png",
  "p255_img140_202x22.png",
  "p255_img141_77x19.png",
  "p301_img161_381x18.png",
  "p381_img210_720x712.png",
]);

function normalizeReaderText(text: string) {
  return text
    .replace(machineEvidenceTokenPattern, "")
    .replace(localTraceTokenPattern, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([，。；：、？！）】》」])/g, "$1")
    .replace(/([（【《「])\s+/g, "$1")
    .trim();
}

function trimAfterFigureDescription(text: string) {
  const cleaned = normalizeReaderText(text);
  const figureMarker = "上图：";
  const figureMarkerIndex = cleaned.indexOf(figureMarker);
  if (figureMarkerIndex >= 0) {
    const fromFigure = cleaned.slice(figureMarkerIndex);
    const verseMarker = fromFigure.search(chineseVerseMarkerPattern);
    return (verseMarker > 0 ? fromFigure.slice(0, verseMarker) : fromFigure).trim();
  }

  const verseMarker = cleaned.search(chineseVerseMarkerPattern);
  return (verseMarker > 0 ? cleaned.slice(0, verseMarker) : cleaned).trim();
}

function sourceEvidenceText(sourceMeta: GenesisResourceSourceMeta | undefined, placementEvidence: string) {
  const sourceText = sourceMeta?.sourceEvidenceSnippet || sourceMeta?.sourceTextSnippet || placementEvidence;
  const withoutMachinePrefix = sourceText.replace(machineEvidencePrefixPattern, "");
  const cleaned = trimAfterFigureDescription(withoutMachinePrefix);
  if (cleaned) {
    return cleaned;
  }
  return trimAfterFigureDescription(placementEvidence.replace(machineEvidencePrefixPattern, ""));
}

function originalEvidenceText(evidence: string) {
  const cleaned = sourceEvidenceText(undefined, evidence);
  const figureMarkerMatch = cleaned.match(/(?:上|下|左|右)?图[:：]/);
  return figureMarkerMatch?.index !== undefined
    ? cleaned.slice(figureMarkerMatch.index + figureMarkerMatch[0].length).trim()
    : cleaned.replace(/^(?:上|下|左|右)?图[:：]\s*/, "").trim();
}

function shortenAtSentence(text: string, maxLength = 120) {
  const normalized = normalizeReaderText(text);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const punctuationBeforeLimit = Math.max(
    normalized.lastIndexOf("。", maxLength),
    normalized.lastIndexOf("；", maxLength),
    normalized.lastIndexOf("，", maxLength),
  );
  if (punctuationBeforeLimit >= 24) {
    return normalized.slice(0, punctuationBeforeLimit + 1);
  }
  return normalized.slice(0, maxLength).trim();
}

function isFigureCaptionText(text: string) {
  return /^(?:上|下|左|右)?图[:：]/.test(normalizeReaderText(text));
}

function cleanGeneratedTitleCandidate(text: string) {
  const normalized = normalizeReaderText(text);
  if (!isFigureCaptionText(normalized) && nonCaptionTitleStartPattern.test(normalized)) {
    return "";
  }

  return normalized
    .replace(/([一-龥])\s+([一-龥])/g, "$1$2")
    .replace(/^(?:上|下|左|右)?图[:：]\s*/, "")
    .replace(/^创世记\s+\d+:\d+\s+\d+\s*/, "")
    .replace(/^《?创世记》?[:：导论\s\d]*/, "")
    .replace(chineseVerseMarkerPattern, "")
    .replace(/^「[^」]{0,80}」\s*/, "")
    .replace(/^主\s*前\s*\d+(?:-\d+)?\s*(?:年|世纪)?(?:的)?/, "")
    .replace(/^公元\s*\d+(?:-\d+)?\s*年(?:的)?/, "")
    .replace(/^\d{3,4}\s*年(?:\s*\d+\s*月\s*\d+\s*日)?[，,]?\s*/, "")
    .replace(/^\d+\s*月\s*\d+\s*日[，,]?\s*/, "")
    .replace(/^约主前\s*\d+\s*年(?:的)?/, "")
    .replace(/(?:。|；|，|,|\.|\s+)?(?:现藏于|藏于|出土于|摄于|长\s*\d+\s*厘米|已发现|大都是|正式).*$/g, "")
    .replace(/[（(][^）)]*(?:[A-Za-z][^）)]*|$)[）)]?/g, "")
    .replace(/([《「][^》」]*?)\s+[A-Za-z][A-Za-z\s’'.-]*([》」])/g, "$1$2")
    .replace(/泰坦星\s*后拍摄的第一张照片.*$/, "泰坦星第一张照片")
    .replace(/的艺术想象图.*$/, "艺术想象图")
    .replace(/的形成示意图.*$/, "形成示意图")
    .replace(/的快速成长周期.*$/, "快速成长周期")
    .replace(/的大致分布.*$/, "大致分布")
    .replace(/的迁徙路线.*$/, "迁徙路线")
    .replace(/[。；，,].*$/g, "")
    .replace(/\s+[A-Za-z][A-Za-z\s’'.-]*$/g, "")
    .replace(/[:：].*$/g, "")
    .replace(/(?:有|是|为|在|从|由|被|已|大都是|一块|其中|主要|象征|开始|时期|时代|遗址).*$/g, "")
    .replace(/[。；，、：:,]+$/g, "")
    .trim();
}

function isCleanGeneratedTitle(title: string) {
  return title.length >= 2
    && title.length <= 24
    && !/^(?:上|下|左|右)?图[:：]|^【创|^创世记\s+\d+:\d+\s+\d+/.test(title)
    && !/[（(][^）)]*$/.test(title)
    && (title.match(/[（(]/g)?.length ?? 0) === (title.match(/[）)]/g)?.length ?? 0)
    && !clippedTitlePattern.test(title);
}

function titleFromOriginalText(originalText: string, fallbackTitle: string) {
  const firstPhrase = cleanGeneratedTitleCandidate(shortenAtSentence(originalText, 72));
  if (isCleanGeneratedTitle(firstPhrase)) {
    return firstPhrase;
  }
  const shorterPhrase = firstPhrase.slice(0, 24).trim();
  if (isCleanGeneratedTitle(shorterPhrase)) {
    return shorterPhrase;
  }
  return fallbackTitle;
}

function titleForFileName(fileName: string, originalText: string, fallbackTitle: string) {
  const titleOverride = generatedTitleOverrideByFilename.get(fileName);
  if (titleOverride) {
    return titleOverride;
  }
  const title = titleFromOriginalText(originalText, fallbackTitle);
  if (isCleanGeneratedTitle(title)) {
    return title;
  }
  const placement = placementSummary(fileName);
  if (placement.scope === "book-intro") {
    return "创世记导论";
  }
  return `创世记图表 ${pageFromFileName(fileName)}`;
}

function defaultReaderCopy(fileName: string, sourceMeta: GenesisResourceSourceMeta): ReaderCopy {
  const placement = placementSummary(fileName);
  const verseReference = verseReferenceForPlacement(fileName);
  const sourceEvidence = sourceEvidenceText(sourceMeta, placement.evidence);
  const originalText = originalEvidenceText(sourceEvidence);
  const fallbackTitle = placement.scope === "book-intro" ? "创世记" : `创世记 ${verseReference}`;
  const title = titleForFileName(fileName, originalText, fallbackTitle);
  const summary = originalText ? shortenAtSentence(originalText) : fallbackTitle;
  const evidence = sourceEvidence ? shortenAtSentence(sourceEvidence, 140) : fallbackTitle;

  return {
    title,
    summary,
    verseReference,
    evidence,
    confidence: placement.confidence,
  };
}

function readerCopyForFileName(fileName: string, sourceMeta: GenesisResourceSourceMeta) {
  return manualReaderCopyByFilename.get(fileName) ?? defaultReaderCopy(fileName, sourceMeta);
}

function readerBody(copy: ReaderCopy) {
  if (copy.body) {
    return copy.body;
  }

  return [
    `摘要：${copy.summary}`,
    `关联经文：${copy.verseReference ?? ""}`,
    `依据：${copy.evidence}`,
  ].join("\n");
}

function searchTextForResource(copy: ReaderCopy, sourceEvidence: string | undefined) {
  if (copy.searchText) {
    return normalizeReaderText([copy.title, copy.searchText].join(" "));
  }

  return normalizeReaderText([
    copy.title,
    copy.summary,
    copy.verseReference,
    copy.evidence,
    sourceEvidence,
  ].filter(Boolean).join(" "));
}

function buildGenesisImageResources({
  assetModules,
  folderLabel,
  idPrefix,
  replacementAssetModules,
  replacementFolderLabel,
  replacementFileNamesByOriginal,
  sourceFileNames,
  sourceFolder,
}: GenesisResourceGroup): StudyResource[] {
  const resourceFileNames = sourceFileNames ?? Object.keys(assetModules ?? {}).map(fileNameFromPath);

  return resourceFileNames
    .filter((fileName) => !nonReaderCardFileNames.has(fileName))
    .sort((leftFileName, rightFileName) => leftFileName.localeCompare(rightFileName))
    .map((fileName) => {
      const replacementFileName = replacementFileNamesByOriginal?.get(fileName);
      const replacementAssetPath = replacementFileName && replacementAssetModules
        ? assetPathForFileName(replacementAssetModules, replacementFileName)
        : undefined;
      const assetPath = assetModules ? assetPathForFileName(assetModules, fileName) : undefined;
      if (!assetPath && !replacementAssetPath) {
        throw new Error(`Missing Genesis resource asset for ${fileName}`);
      }

      const page = pageFromFileName(fileName);
      const verses = versesForFileName(fileName);
      const primaryAnchor = primaryAnchorForFileName(fileName, verses);
      const placement = placementSummary(fileName);
      const isBookIntro = placement.scope === "book-intro";
      const sourceMeta = genesisResourceSourceMetaByFilename.get(fileName);
      if (!sourceMeta) {
        throw new Error(`Missing Genesis resource source metadata for ${fileName}`);
      }
      const copy = readerCopyForFileName(fileName, sourceMeta);
      const searchableSourceEvidence = sourceEvidenceText(sourceMeta, placement.evidence);

      return {
        id: `${idPrefix}-${resourceSlug(fileName)}`,
        title: copy.title,
        type: "image",
        verses,
        ...(primaryAnchor ? { primaryAnchor } : {}),
        ...(isBookIntro ? { bookIntro: "Gen" } : {}),
        body: readerBody(copy),
        summary: copy.summary,
        searchText: searchTextForResource(copy, searchableSourceEvidence),
        assetPath: replacementAssetPath ?? assetPath,
        debugMeta: {
          fileName,
          ...(replacementFileName ? {
            originalFileName: fileName,
            replacementFileName,
          } : {}),
          sourceFolder: sourceFolderFromStoredRelativePath(sourceMeta.storedRelativePath) ?? sourceFolder,
          sourcePackage,
          sourcePdf: sourceMeta.sourcePdf,
          sourcePdfPath: sourceMeta.sourcePdfPath,
          sourcePdfSha256: sourceMeta.sourcePdfSha256,
          sourceManifestPath: sourceMeta.sourceManifestPath,
          sourceLedgerPath: sourceMeta.sourceLedgerPath,
          sourceTextSource: sourceMeta.sourceTextSource,
          sourceTextSnippet: sourceMeta.sourceTextSnippet,
          sourceEvidenceType: sourceMeta.sourceEvidenceType,
          sourceEvidenceSnippet: sourceMeta.sourceEvidenceSnippet,
          sourceEvidencePage: sourceMeta.sourceEvidencePage,
          sourceEvidenceOrigin: sourceMeta.sourceEvidenceOrigin,
          captionRiskFlags: sourceMeta.captionRiskFlags,
          samePageImageCount: sourceMeta.samePageImageCount,
          samePageCaptionCount: sourceMeta.samePageCaptionCount,
          storedFilename: sourceMeta.storedFilename,
          storedRelativePath: sourceMeta.storedRelativePath,
          storedAbsolutePath: sourceMeta.storedAbsolutePath,
          imageNum: sourceMeta.imageNum,
          objectId: sourceMeta.objectId,
          pageCount: sourceMeta.pageCount,
          manifestLine: sourceMeta.manifestLine,
          reviewStatus: sourceMeta.reviewStatus,
          contentStatus: sourceMeta.contentStatus,
          navigationStatus: sourceMeta.navigationStatus,
          subtype: sourceMeta.visualSubtype,
          runId: sourceMeta.runId,
          sourceId: sourceMeta.sourceId,
          imageKey: sourceMeta.imageKey,
          folderLabel: replacementAssetPath ? replacementFolderLabel ?? folderLabel : folderLabel,
          page,
          confidence: placement.confidence,
          evidence: placement.evidence,
          ...(primaryAnchor ? { primaryAnchor } : {}),
          coverageRanges: placement.ranges,
          ...(placement.relatedRanges ? { relatedRanges: placement.relatedRanges } : {}),
        },
      };
    });
}

export const genesisResources: StudyResource[] = [
  ...buildGenesisImageResources({
    assetModules: cmcAssets,
    folderLabel: "src/assets/resources/genesis/images/cmc-01",
    idPrefix: "genesis-cmc-01",
    sourceFolder: "CMC-01_副本",
  }),
  ...buildGenesisImageResources({
    folderLabel: "src/assets/resources/genesis/images/ohb-genesis-codex-v2",
    idPrefix: "genesis-ohb-genesis-codex-v2",
    replacementAssetModules: codexV2CropAssets,
    replacementFolderLabel: "src/assets/resources/genesis/images/ohb-genesis-codex-v2-crops",
    replacementFileNamesByOriginal: codexV2CropFileNamesByOriginal,
    sourceFileNames: Array.from(codexV2CropFileNamesByOriginal.keys()),
    sourceFolder: "01_创世记-v3",
  }),
];

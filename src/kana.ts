export type KanaScript = "hiragana" | "katakana";

export type Kana = {
  id: string;
  script: KanaScript;
  groupId: string;
  kana: string;
  romaji: string;
  audioUrl?: string;
};

export type KanaGroup = {
  id: string;
  label: string;
  script: KanaScript;
  kana: Kana[];
};

const GROUPS = [
  {
    id: "vowels",
    label: "Vowels",
    hiragana: [
      ["あ", "a"],
      ["い", "i"],
      ["う", "u"],
      ["え", "e"],
      ["お", "o"]
    ],
    katakana: [
      ["ア", "a"],
      ["イ", "i"],
      ["ウ", "u"],
      ["エ", "e"],
      ["オ", "o"]
    ]
  },
  {
    id: "k",
    label: "K row",
    hiragana: [
      ["か", "ka"],
      ["き", "ki"],
      ["く", "ku"],
      ["け", "ke"],
      ["こ", "ko"]
    ],
    katakana: [
      ["カ", "ka"],
      ["キ", "ki"],
      ["ク", "ku"],
      ["ケ", "ke"],
      ["コ", "ko"]
    ]
  },
  {
    id: "s",
    label: "S row",
    hiragana: [
      ["さ", "sa"],
      ["し", "shi"],
      ["す", "su"],
      ["せ", "se"],
      ["そ", "so"]
    ],
    katakana: [
      ["サ", "sa"],
      ["シ", "shi"],
      ["ス", "su"],
      ["セ", "se"],
      ["ソ", "so"]
    ]
  },
  {
    id: "t",
    label: "T row",
    hiragana: [
      ["た", "ta"],
      ["ち", "chi"],
      ["つ", "tsu"],
      ["て", "te"],
      ["と", "to"]
    ],
    katakana: [
      ["タ", "ta"],
      ["チ", "chi"],
      ["ツ", "tsu"],
      ["テ", "te"],
      ["ト", "to"]
    ]
  },
  {
    id: "n",
    label: "N row",
    hiragana: [
      ["な", "na"],
      ["に", "ni"],
      ["ぬ", "nu"],
      ["ね", "ne"],
      ["の", "no"]
    ],
    katakana: [
      ["ナ", "na"],
      ["ニ", "ni"],
      ["ヌ", "nu"],
      ["ネ", "ne"],
      ["ノ", "no"]
    ]
  },
  {
    id: "h",
    label: "H row",
    hiragana: [
      ["は", "ha"],
      ["ひ", "hi"],
      ["ふ", "fu"],
      ["へ", "he"],
      ["ほ", "ho"]
    ],
    katakana: [
      ["ハ", "ha"],
      ["ヒ", "hi"],
      ["フ", "fu"],
      ["ヘ", "he"],
      ["ホ", "ho"]
    ]
  },
  {
    id: "m",
    label: "M row",
    hiragana: [
      ["ま", "ma"],
      ["み", "mi"],
      ["む", "mu"],
      ["め", "me"],
      ["も", "mo"]
    ],
    katakana: [
      ["マ", "ma"],
      ["ミ", "mi"],
      ["ム", "mu"],
      ["メ", "me"],
      ["モ", "mo"]
    ]
  },
  {
    id: "y",
    label: "Y row",
    hiragana: [
      ["や", "ya"],
      ["ゆ", "yu"],
      ["よ", "yo"]
    ],
    katakana: [
      ["ヤ", "ya"],
      ["ユ", "yu"],
      ["ヨ", "yo"]
    ]
  },
  {
    id: "r",
    label: "R row",
    hiragana: [
      ["ら", "ra"],
      ["り", "ri"],
      ["る", "ru"],
      ["れ", "re"],
      ["ろ", "ro"]
    ],
    katakana: [
      ["ラ", "ra"],
      ["リ", "ri"],
      ["ル", "ru"],
      ["レ", "re"],
      ["ロ", "ro"]
    ]
  },
  {
    id: "w-n",
    label: "W + N",
    hiragana: [
      ["わ", "wa"],
      ["を", "wo"],
      ["ん", "n"]
    ],
    katakana: [
      ["ワ", "wa"],
      ["ヲ", "wo"],
      ["ン", "n"]
    ]
  },
  {
    id: "dakuten",
    label: "Dakuten",
    hiragana: [
      ["が", "ga"],
      ["ぎ", "gi"],
      ["ぐ", "gu"],
      ["げ", "ge"],
      ["ご", "go"],
      ["ざ", "za"],
      ["じ", "ji"],
      ["ず", "zu"],
      ["ぜ", "ze"],
      ["ぞ", "zo"],
      ["だ", "da"],
      ["ぢ", "ji"],
      ["づ", "zu"],
      ["で", "de"],
      ["ど", "do"],
      ["ば", "ba"],
      ["び", "bi"],
      ["ぶ", "bu"],
      ["べ", "be"],
      ["ぼ", "bo"],
      ["ぱ", "pa"],
      ["ぴ", "pi"],
      ["ぷ", "pu"],
      ["ぺ", "pe"],
      ["ぽ", "po"]
    ],
    katakana: [
      ["ガ", "ga"],
      ["ギ", "gi"],
      ["グ", "gu"],
      ["ゲ", "ge"],
      ["ゴ", "go"],
      ["ザ", "za"],
      ["ジ", "ji"],
      ["ズ", "zu"],
      ["ゼ", "ze"],
      ["ゾ", "zo"],
      ["ダ", "da"],
      ["ヂ", "ji"],
      ["ヅ", "zu"],
      ["デ", "de"],
      ["ド", "do"],
      ["バ", "ba"],
      ["ビ", "bi"],
      ["ブ", "bu"],
      ["ベ", "be"],
      ["ボ", "bo"],
      ["パ", "pa"],
      ["ピ", "pi"],
      ["プ", "pu"],
      ["ペ", "pe"],
      ["ポ", "po"]
    ]
  },
  {
    id: "yoon",
    label: "Yoon",
    hiragana: [
      ["きゃ", "kya"],
      ["きゅ", "kyu"],
      ["きょ", "kyo"],
      ["しゃ", "sha"],
      ["しゅ", "shu"],
      ["しょ", "sho"],
      ["ちゃ", "cha"],
      ["ちゅ", "chu"],
      ["ちょ", "cho"],
      ["にゃ", "nya"],
      ["にゅ", "nyu"],
      ["にょ", "nyo"],
      ["ひゃ", "hya"],
      ["ひゅ", "hyu"],
      ["ひょ", "hyo"],
      ["みゃ", "mya"],
      ["みゅ", "myu"],
      ["みょ", "myo"],
      ["りゃ", "rya"],
      ["りゅ", "ryu"],
      ["りょ", "ryo"],
      ["ぎゃ", "gya"],
      ["ぎゅ", "gyu"],
      ["ぎょ", "gyo"],
      ["じゃ", "ja"],
      ["じゅ", "ju"],
      ["じょ", "jo"],
      ["びゃ", "bya"],
      ["びゅ", "byu"],
      ["びょ", "byo"],
      ["ぴゃ", "pya"],
      ["ぴゅ", "pyu"],
      ["ぴょ", "pyo"]
    ],
    katakana: [
      ["キャ", "kya"],
      ["キュ", "kyu"],
      ["キョ", "kyo"],
      ["シャ", "sha"],
      ["シュ", "shu"],
      ["ショ", "sho"],
      ["チャ", "cha"],
      ["チュ", "chu"],
      ["チョ", "cho"],
      ["ニャ", "nya"],
      ["ニュ", "nyu"],
      ["ニョ", "nyo"],
      ["ヒャ", "hya"],
      ["ヒュ", "hyu"],
      ["ヒョ", "hyo"],
      ["ミャ", "mya"],
      ["ミュ", "myu"],
      ["ミョ", "myo"],
      ["リャ", "rya"],
      ["リュ", "ryu"],
      ["リョ", "ryo"],
      ["ギャ", "gya"],
      ["ギュ", "gyu"],
      ["ギョ", "gyo"],
      ["ジャ", "ja"],
      ["ジュ", "ju"],
      ["ジョ", "jo"],
      ["ビャ", "bya"],
      ["ビュ", "byu"],
      ["ビョ", "byo"],
      ["ピャ", "pya"],
      ["ピュ", "pyu"],
      ["ピョ", "pyo"]
    ]
  }
] as const;

const RECORDED_SOUND_EXTENSIONS: Record<string, "mp3" | "oga"> = {
  a: "mp3",
  chi: "mp3",
  e: "mp3",
  fu: "mp3",
  ha: "mp3",
  he: "mp3",
  hi: "mp3",
  ho: "mp3",
  i: "mp3",
  ka: "mp3",
  ke: "mp3",
  ki: "mp3",
  ko: "mp3",
  ku: "mp3",
  ma: "mp3",
  me: "mp3",
  mi: "mp3",
  mo: "mp3",
  mu: "mp3",
  n: "mp3",
  na: "mp3",
  ne: "mp3",
  ni: "mp3",
  no: "mp3",
  nu: "mp3",
  o: "mp3",
  ra: "mp3",
  re: "mp3",
  ri: "mp3",
  ro: "mp3",
  ru: "mp3",
  ga: "mp3",
  gi: "mp3",
  gu: "mp3",
  ge: "mp3",
  go: "mp3",
  za: "mp3",
  ji: "mp3",
  zu: "mp3",
  ze: "mp3",
  zo: "mp3",
  da: "mp3",
  de: "mp3",
  do: "mp3",
  ba: "mp3",
  bi: "mp3",
  bu: "mp3",
  be: "mp3",
  bo: "mp3",
  pa: "mp3",
  pi: "mp3",
  pu: "mp3",
  pe: "mp3",
  po: "mp3",
  sa: "mp3",
  se: "mp3",
  shi: "mp3",
  so: "mp3",
  su: "mp3",
  ta: "mp3",
  te: "mp3",
  to: "mp3",
  tsu: "mp3",
  u: "mp3",
  wa: "mp3",
  wo: "mp3",
  ya: "mp3",
  yo: "mp3",
  yu: "mp3",
  kya: "mp3",
  kyu: "mp3",
  kyo: "mp3",
  sha: "mp3",
  shu: "mp3",
  sho: "mp3",
  cha: "mp3",
  chu: "mp3",
  cho: "mp3",
  nya: "mp3",
  nyu: "mp3",
  nyo: "mp3",
  hya: "mp3",
  hyu: "mp3",
  hyo: "mp3",
  mya: "mp3",
  myu: "mp3",
  myo: "mp3",
  rya: "mp3",
  ryu: "mp3",
  ryo: "mp3",
  gya: "mp3",
  gyu: "mp3",
  gyo: "mp3",
  ja: "mp3",
  ju: "mp3",
  jo: "mp3",
  bya: "mp3",
  byu: "mp3",
  byo: "mp3",
  pya: "mp3",
  pyu: "mp3",
  pyo: "mp3"
};

function toKana(script: KanaScript, groupId: string, rows: readonly (readonly [string, string])[]): Kana[] {
  return rows.map(([kana, romaji]) => {
    const audioUrl = sampleUrl(romaji);
    return {
      id: `${script}:${kana}`,
      script,
      groupId,
      kana,
      romaji,
      audioUrl
    };
  });
}

export const KANA_GROUPS: KanaGroup[] = GROUPS.flatMap((group) => [
  {
    id: `hiragana:${group.id}`,
    label: group.label,
    script: "hiragana",
    kana: toKana("hiragana", group.id, group.hiragana)
  },
  {
    id: `katakana:${group.id}`,
    label: group.label,
    script: "katakana",
    kana: toKana("katakana", group.id, group.katakana)
  }
]);

export const KANA: Kana[] = KANA_GROUPS.flatMap((group) => group.kana);

function sampleUrl(soundId: string): string | undefined {
  const extension = RECORDED_SOUND_EXTENSIONS[soundId];
  return extension ? `/sounds/${soundId}.${extension}` : undefined;
}

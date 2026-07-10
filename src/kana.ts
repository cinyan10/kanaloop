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
  }
] as const;

function toKana(
  script: KanaScript,
  groupId: string,
  rows: readonly (readonly [string, string])[],
  audioRows?: readonly (readonly [string, string])[]
): Kana[] {
  return rows.map(([kana, romaji], index) => {
    const audioId = audioRows?.[index]?.[1];
    return {
      id: `${script}:${kana}`,
      script,
      groupId,
      kana,
      romaji,
      audioUrl: audioId ? sampleUrl(audioId) : undefined
    };
  });
}

export const KANA_GROUPS: KanaGroup[] = GROUPS.flatMap((group) => [
  {
    id: `hiragana:${group.id}`,
    label: group.label,
    script: "hiragana",
    kana: toKana("hiragana", group.id, group.hiragana, group.id === "dakuten" ? undefined : group.hiragana)
  },
  {
    id: `katakana:${group.id}`,
    label: group.label,
    script: "katakana",
    kana: toKana("katakana", group.id, group.katakana, group.id === "dakuten" ? undefined : group.hiragana)
  }
]);

export const KANA: Kana[] = KANA_GROUPS.flatMap((group) => group.kana);

function sampleUrl(soundId: string): string {
  return `/sounds/${soundId}.mp3`;
}

# KanaLoop

KanaLoop is a browser-based kana drill app for learning hiragana and katakana. It lets you choose which kana to practice, saves progress locally, schedules reviews based on your answers, and plays pronunciation audio when you reveal a card.

Short description: a lightweight hiragana and katakana practice app with local progress tracking and pronunciation playback.

## Development

```bash
npm install
npm run dev
```

## Tests and Build

```bash
npm run test
npm run build
```

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Runtime: static assets only, no server functions required

## License

GPL-3.0. See [LICENSE](LICENSE).

## Audio

Basic kana MP3 samples in `public/sounds/` are from [`digitaIfabric/japanese`](https://github.com/digitaIfabric/japanese). That repository does not currently publish an explicit license file.

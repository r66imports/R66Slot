r66-logo CLI

Quick start

1. From the tool folder, install dependencies:

```bash
cd tools/logo-cli
npm install
```

2. Create a logo:

```bash
node index.js create-logo -t "My Brand" --width 800 --height 200 --font-size 72 --color "#ffffff" --bg "#000000" -o mylogo.png
```

3. Overlay the logo on a photo:

```bash
node index.js overlay -b ../some-photo.jpg -l mylogo.png -o photo-with-logo.jpg --gravity southeast --dx 20 --dy 20
```

4. Resize an image:

```bash
node index.js resize -i input.jpg -o output.jpg --width 1200
```

Notes

- This is a minimal starter. For production, consider adding:
  - font loading and custom TTF support (generate SVG referencing a webfont or installed font)
  - better CLI help and validation
  - tests and CI build
  - Windows-friendly installation notes for Sharp (see Sharp docs)


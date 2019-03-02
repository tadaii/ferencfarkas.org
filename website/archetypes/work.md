---
title: "{{ replace .TranslationBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true

ff-id: <number> # 4-digit work id => 0001
ff-for:
  - <text>
  - <text>
ff-duration: 00:00
ff-composition-date: 19XX
ff-parts:
  - [1, part 1]
  - [2, part 2]
ff-dedication: <text>
ff-publication: <text|id>
ff-reworking:
  - <text|id>
  - <text|id>
ff-samples:
  - url: /path/to/audio.flac
  - part: <text>
---

# Photo Comic Page Prompting

Use this structure for each generated image.

```text
Use case: full realistic candid photo-comic page
Asset type: <cover | story page n of total>, 4:5 portrait aspect ratio
Primary request: Create a complete realistic photo-comic page, not a single image, not anime, not illustration.
Story role: <what this page must accomplish in the narrative>
Character/reference bible for continuity: <stable visible details for every recurring character, outfit, prop, and location>
Page layout: <cover composition or panel grid, panel sizes, reading order>
Caption boxes: <short narration and rare short speech to generate directly inside rectangular caption boxes in the page art>
Visual beats: <panel-by-panel actions and emotions>
Setting and props: <recurring locations, objects, symbols>
Photo style: realistic candid photo-comic, documentary phone-photo or handheld photojournalism look, natural imperfect framing, believable real-world lighting, photoreal action VFX, realistic depth of field and motion blur only where appropriate, clean rectangular caption boxes.
Constraints: 4:5 portrait full page, caption boxes only, no speech bubbles, no thought bubbles, no floating dialogue, no subtitles, no watermark, no logo, no extra unreadable text. All readable story text must be generated directly inside the page art; do not leave blank caption boxes or art-only panels for later typesetting. Keep all recurring characters visually consistent with the character/reference bible.
```

## Page Count Guidance

- 4 pages: cover, setup, crisis, resolution.
- 6 pages: cover, setup, first obstacle, reversal, choice, resolution.
- 8 pages: cover, setup, inciting incident, escalation, complication, low point, active choice, resolution.

Prefer 8 pages when the user asks for a complete comic and time allows. Use fewer pages for quick tests or compact premises.

## Caption Style

Use caption boxes as the only text vehicle. Narration can be poetic, but it must remain clear. The caption text is part of the generated image prompt, never a separate overlay step.

Good caption-box directions:

```text
Top caption box: "Mira reached the city at sunrise."
Small lower caption box: "The gate opened only after she put the camera down."
```

Avoid:

```text
Speech bubble saying...
Thought bubble saying...
Large paragraphs of tiny text...
Floating subtitles...
```

## Photo-Comic Style Checklist

- Looks like candid photos arranged as comic panels, not painted panels.
- Uses natural or plausible on-location lighting.
- Allows modest real-camera imperfections: motion blur, uneven framing, emergency-phone-video energy, documentary angles.
- Keeps effects photoreal: lasers, flight, energy, smoke, rain, fire, and impacts should look composited into real photos.
- Keeps caption boxes readable and integrated into the generated page art, with no later text overlay or separate typesetting pass.
- Avoids glossy poster art unless the page is the cover.

## Continuity Checklist

Before each prompt, copy forward:

- Names and roles.
- Hair, eyes, skin tone, face shape, outfit, and color accents.
- Signature item or visual motif.
- Current emotional state.
- Any story changes that should persist, such as a torn sleeve, glowing mark, dust, injury, recovered object, or changed location.
- Whether text visible on clothing or props is only a visual detail or is meant to be a name/title.

## Story Checklist

Each story page should have a clear job:

- Page 2 establishes protagonist, want, and world.
- Early pages show the obstacle and stakes.
- Middle pages escalate through consequence, not random spectacle.
- Penultimate page shows the protagonist making the decisive choice.
- Final page shows the result of that choice and gives emotional closure.

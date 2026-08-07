# CLAUDE.md

---
- do not use any frame works like nextjs/react. Use plain js/html and css

## How to respond to me

<!-- Your rules go here. A few starters — keep, change or delete them. -->

- Don't re-explain code I can read. Explain the *why* when it isn't
  obvious from the diff.
- Don't explain every minute detail of the changes unless i ask explicitely
- Point out potential future issues if you think there could be any. When pointing out potential future issues, highlight the text when writing them. Explain the circumstance that would trigger them, and mention a potential fix in a concise manner
- When adding any new Variables which control visual parameters, list them out along with what they control in a table format
- Try to keep your messages concise, don't spend too many tokens on the message, I would rather you focus on the code output 

## Workflow

- **Do not start a preview server or verify in the browser.** I check
  the site myself. Write the change, explain it, and stop. I will ask
  for a verification pass when I want one.
- **Do NOT remove any editor tooling unless I explicitly tell you to.**
  This includes GUI panels, TransformControls gizmos, OrbitControls,
  grid/axes helpers, copy-to-clipboard, and similar dev scaffolding.
  When I ask you to "bake" values, write the baked values in but leave
  all the tooling in place.
- Don't leave scratch files in the repo. Clean up anything temporary.
- Prefer editing existing files over adding new ones.
- If you are exposing controllable parameters as GUI, always ensure the names on the GUI labels and the variable names are consistent, descriptive, and when the user hover's over the GUI control, it shows a tooltip that explains that parameter.
- Add a small * or similar icon next to the GUI Label of any controllable paramter that has JUST been added. Remove the mark from older ones. (better if you can color the label in a different color to make it stand out)
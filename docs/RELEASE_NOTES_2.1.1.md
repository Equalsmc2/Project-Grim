# Project Grim 2.1.1: natural wind and performance

## Trees and grass
The old sway held trunks still and pushed only the leaves sideways, by an amount that grew with the square of their height. Canopies slid off their trunks and stretched like rubber.

Now:
- Every plant bends as one piece from its root, trunk included. The bend is a rotation, so nothing changes length.
- Plants lean the way the wind actually blows. Gusts roll across the field, so neighbouring trees move together.
- Leaves add only a very small flutter on top.
- Rocks, walls and ruins never move.

## Performance

| Change | Effect |
|---|---|
| Pixel budget | 4K TVs are no longer rendered at full 4K internally (Low 1.3 MP, Balanced 2.6 MP, High 4.2 MP). The single biggest saving on large displays; edges stay sharp thanks to antialiasing. |
| Shadow cadence | Balanced redraws the shadow map every second frame instead of every frame. |
| Frame caps | Low quality runs at 30 fps, and so does the GM's live preview while you aren't touching it. It returns to 60 fps the moment you orbit, drag or paint. This frees the GM laptop for the TV tab and the rest of the page. |
| Camera-only updates | When the GM moves the tactical camera, the TV no longer re-processes cards, maps and terrain (previously up to 4 times a second). |
| Terrain mesh | About 33% fewer triangles (the encounter area is near-flat; fog hides the far hills). |
| Smaller fixes | No per-frame memory allocations in the lighting and scenery code; the selected tactical square is computed once per change instead of every frame. |
| Auto-resolution | Judges frame time against the active frame cap, so a 30 fps cap never lowers resolution. |

## Tests
47/47 unit and regression, 16/16 page checks.

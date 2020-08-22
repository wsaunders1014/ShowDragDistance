# ShowDragDistance
Shows distance you've dragged the token as if you used the Ruler tool. Configurable to show path by default or hide it. Holding CTRL while dragging token hides/shows path based on what's opposite of default setting.

Rangefinder: With a single token selected, hold CTRL on the canvas and it will draw a ruler from token to mouse. Replaces need to CTRL + drag from token(you can still do that) Using the CTRL ruler shortcut unaffected as well.

Default ruler behaviour is unchanged.

#Changelog
1.1.2
- Fixed bug where path would stop updating when you drag token back to starting position, it now disappears if minimum 5ft distance isn't reached.

1.1.1
- Fixed issue with Select box freezing on mouseover of controlled token.
- Fixed issue where endpoint would remain on grid after using Space to move on rangefinder.
- Fixed issue where rangefinder would not update on mousemove until you dragged token.

KNOWN BUG: You can't add waypoints to rangefinder ruler. The ruler will intermittently reset causing the waypoints to reset.

1.0.9
- Fixed issue where a user couldn't pan after another user moved their token. I am no longer able to reproduce the issue. If you run into it again, please let me know.

1.0.7
- Removed incorrect messaging surround ALT button in settings. Confined CTRL functionality to Left CTRL only.

1.0.5
- Rebuilt from scratch. Fixed previous bugs.

1.0.4
- FIxed bug that required you to hover over token, then out, then back in to use default ruler function.

1.0.3
- Fixed bug when dragging over another token that would remove distance label.

1.0.2
- Fixed bug where distance would show up after clicking on Token but not dragging.

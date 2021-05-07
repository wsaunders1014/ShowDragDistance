# ShowDragDistance
Shows distance you've dragged the token as if you used the Ruler tool. Right click to set waypoints. Press 'X' to delete waypoints. 

Rangefinder: With a single token selected, hold CTRL on the canvas and it will draw a ruler from token to mouse. Replaces need to CTRL + drag from token(you can still do that) Using the CTRL ruler shortcut unaffected as well.


New Settings:
You can now point to where the speed or movement attribute is located on the actor sheet. For instance, for DnD5e it is `actor.data.data.attributes.speed.value`. You can also point to a bonus movement attribute if your system has one. In addition you can use `token.setFlag('ShowDragDistance','speed',{normal:0,dash:0})` to add any one time speed boosts via macro. The DragRuler also calls Hook.call('moveToken', token, dragRuler) when the token moves. Drag colors are configurable in client side settings if they are too close to player's color.

# Changelog
2.2.3 - Added PF2 support. Fixed shift dragging not working now.

2.2.2 - Rebuilt the line drawing algorithms, Now works on hex grids again. Can now set `token.ignoreTerrain=true` to ignore difficult terrain.

2.2.1 - Fixed bug that froze application when dragging token off grid.

2.2.0 - Add support for Terrain Layer - Drag Distance now calculates path through difficult terrain. Created a new more efficient method for highlighting squares. Confirm 7.5 support. Removed 'x' key conflict with other modules.

2.1.9 - Fix multiple tokens not dragging. Fixed some bugs with gridless maps. Fix math on creating waypoints. Fix some issues with shift dragging off grid.

2.1.8 - Fixed shift dropping tokens off grid. GMs can now move tokens through walls again.

2.1.7 - Merged Spanish Language pull request.

2.1.6 - Token now follows path set with waypoints again. This was broken last release.Tokens with zero movement speed now highlight red as all movement is outside their speed.

2.1.5 - Now cancels ruler and movement if you drag token back to starting point. Holding shift will now let you place token off grid, as it should. Pressing escape while dragging will now cancel drag.

2.1.4 - Fixed conflict with Pick-Up-Stix.

2.1.3 - Fixed user broadcasting.

2.1.2 - DragRuler no longer shows for GM movements, unless the GM holds down 'Alt' to broadcast. If your movement speed uses decimals, it will now work properly. You can now also press 'P' to place a waypoint while dragging if you're on a touchpad.


2.1.1 - Fixed broken broadcasting. Fixed bug with Rangefinder firing when trying to use the actual ruler tool. Merged KO pull request. Pressing 'P' now adds a waypoint while dragging as well as right click for users on touch pads.

2.1.0 - Added dash measurement, added configurability to work better with other systems. 

2.0.5 - Fix issue with distance calculation when you set waypoint before exceeding movement speed. Changed broadcast ruler color to be correct user color instead of using player's color.

2.0.4 - Added ruler broadcasting to others.

2.0.3 - Fixed bug with placeable objects. Pressing X will now cancel movement if there are no more waypoints to remove.

2.0.0 - Complete revamp. Seems stable, but might be conflicts with other mods. If so please revert to 1.1.4.

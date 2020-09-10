# ShowDragDistance
Shows distance you've dragged the token as if you used the Ruler tool. Right click to set waypoints. Press 'X' to delete waypoints. 

Rangefinder: With a single token selected, hold CTRL on the canvas and it will draw a ruler from token to mouse. Replaces need to CTRL + drag from token(you can still do that) Using the CTRL ruler shortcut unaffected as well.

There's a known bug with the actual ruler tool.

New Settings:
You can now point to where the speed or movement attribute is located on the actor sheet. For instance, for DnD5e it is `actor.data.data.attributes.speed.value`. You can also point to a bonus movement attribute if your system has one. In addition you can use token.setFlag('ShowDragDistance','speed',{normal:0,dash:0}) to add any one time speed boosts via macro. The DragRuler also calls Hook.call('moveToken', token, dragRuler) when the token moves. Drag colors are configurable in client side settings if they are too close to player's color.

# Changelog
2.1.0 - Added dash measurement, added configurability to work better with other systems. 

2.0.5 - Fix issue with distance calculation when you set waypoint before exceeding movement speed. Changed broadcast ruler color to be correct user color instead of using player's color.

2.0.4 - Added ruler broadcasting to others.

2.0.3 - Fixed bug with placeable objects. Pressing X will now cancel movement if there are no more waypoints to remove.

2.0.0 - Complete revamp. Seems stable, but might be conflicts with other mods. If so please revert to 1.1.4.

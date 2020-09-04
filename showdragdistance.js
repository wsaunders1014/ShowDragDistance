let showDragDistance = true;
let handleDragCancel;

class DragRuler extends Ruler{
	constructor(user, {color=null}={}) {
	    super();
	    this.dragRuler = this.addChild(new PIXI.Graphics());
	    this.ruler = null;
	    this.name = `DragRuler.${user._id}`;
	    canvas.grid.addHighlightLayer(this.name);
  	}
   	clear() {
	    this._state = Ruler.STATES.INACTIVE;
	    this.waypoints = [];
	    this.dragRuler.clear();
	    this.labels.removeChildren().forEach(c => c.destroy());
	    canvas.grid.clearHighlightLayer(this.name);
  	}
  	_onMouseUp(event) {
  		//console.log(event);
	   // const oe = event.data.originalEvent;
	   // const isCtrl = oe.ctrlKey || oe.metaKey;
	   // if ( !isCtrl ) 
	    	this._endMeasurement();
  	}
  	measure(destination, {gridSpaces=true}={}) {
	    destination = new PIXI.Point(...canvas.grid.getCenter(destination.x, destination.y));
	    const waypoints = this.waypoints.concat([destination]);
	    const r = this.dragRuler;
	    this.destination = destination;

	    // Iterate over waypoints and construct segment rays
	    const segments = [];
	    for ( let [i, dest] of waypoints.slice(1).entries() ) {
	      const origin = waypoints[i];
	      const label = this.labels.children[i];
	      const ray = new Ray(origin, dest);
	      if ( ray.distance < (0.2 * canvas.grid.size) ) {
	        if ( label ) label.visible = false;
	        continue;
	      }
	      segments.push({ray, label});
	    }

	    // Compute measured distance
	    const distances = canvas.grid.measureDistances(segments, {gridSpaces});
	    let totalDistance = 0;
	    for ( let [i, d] of distances.entries() ) {
	      totalDistance += d;
	      let s = segments[i];
	      s.last = i === (segments.length - 1);
	      s.distance = d;
	      s.text = this._getSegmentLabel(d, totalDistance, s.last);
	    }

	    // Clear the grid highlight layer
	    const hlt = canvas.grid.highlightLayers[this.name];
	    hlt.clear();

	    // Draw measured path
	    r.clear();
	    for ( let s of segments ) {
	      const {ray, label, text, last} = s;

	      // Draw line segment
	      r.lineStyle(6, 0x000000, 0.5).moveTo(ray.A.x, ray.A.y).lineTo(ray.B.x, ray.B.y)
	       .lineStyle(4, this.color, 0.25).moveTo(ray.A.x, ray.A.y).lineTo(ray.B.x, ray.B.y);

	      // Draw the distance label just after the endpoint of the segment
	      if ( label ) {
	        label.text = text;
	        label.alpha = last ? 1.0 : 0.5;
	        label.visible = true;
	        let labelPosition = ray.project((ray.distance + 50) / ray.distance);
	        label.position.set(labelPosition.x, labelPosition.y);
	      }

	      // Highlight grid positions
	      this._highlightMeasurement(ray);
	    }

	    // Draw endpoints
	    for ( let p of waypoints ) {
	      r.lineStyle(2, 0x000000, 0.5).beginFill(this.color, 0.25).drawCircle(p.x, p.y, 8);
	    }

	    // Return the measured segments
	    return segments;
  	}
  	_getMovementToken() {
  		console.log(this.waypoints)
	    let [x0, y0] = Object.values(this.waypoints[0]);
	    const tokens = new Set(canvas.tokens.controlled);
	    if ( !tokens.size && game.user.character ) {
	      const charTokens = game.user.character.getActiveTokens();
	      if ( charTokens.length ) tokens.add(...charTokens);
	    }
	    if ( !tokens.size ) return null;
	    return Array.from(tokens).find(t => {
	      let pos = new PIXI.Rectangle(t.x - 1, t.y - 1, t.w + 2, t.h + 2);
	      return pos.contains(x0, y0);
	    });
  	}
  	async moveToken() {
	    let wasPaused = game.paused;
	    if ( wasPaused && !game.user.isGM ) {
	      ui.notifications.warn(game.i18n.localize("GAME.PausedWarning"));
	      return false;
	    }
	    if ( !this.visible || !this.destination ) return false;
	    const token = this._getMovementToken();
	    if ( !token ) return;

	    // Determine offset relative to the Token top-left.
	    // This is important so we can position the token relative to the ruler origin for non-1x1 tokens.
	    const origin = canvas.grid.getTopLeft(this.waypoints[0].x, this.waypoints[0].y);
	    const s2 = canvas.dimensions.size / 2;
	    const dx = Math.round((token.data.x - origin[0]) / s2) * s2;
	    const dy = Math.round((token.data.y - origin[1]) / s2) * s2;

	    // Get the movement rays and check collision along each Ray
	    // These rays are center-to-center for the purposes of collision checking
	    const rays = this._getRaysFromWaypoints(this.waypoints, this.destination);
	    let hasCollision = rays.some(r => canvas.walls.checkCollision(r));
	    console.log('hasCollision',hasCollision)
	    if ( hasCollision ) {
	      ui.notifications.error(game.i18n.localize("ERROR.TokenCollide"));
	      return;
	    }

	    // Execute the movement path.
	    // Transform each center-to-center ray into a top-left to top-left ray using the prior token offsets.
	    this._state = Ruler.STATES.MOVING;
	    token._noAnimate = true;
	    for ( let r of rays ) {
	      if ( !wasPaused && game.paused ) break;
	      const dest = canvas.grid.getTopLeft(r.B.x, r.B.y);
	      const path = new Ray({x: token.x, y: token.y}, {x: dest[0] + dx, y: dest[1] + dy});
	      await token.update(path.B);
	      await token.animateMovement(path);
	    }
	    token._noAnimate = false;

	    // Once all animations are complete we can clear the ruler
	    this._endMeasurement();
  	}
	static patchFunction(func, line_number, line, new_line) {
		let funcStr = func.toString()
		let lines = funcStr.split("\n")
		if (lines[line_number].trim() == line.trim()) {
			let fixed = funcStr.replace(line, new_line)
			return Function('"use strict";return (function ' + fixed + ')')();
		}
		return func;
	}
	static init() {
		CONFIG.debug.mouseInteraction = true;
		CONFIG.debug.hooks = true;
		//handleDragCancel = MouseInteractionManager._handleDragCancel;
		game.settings.register('ShowDragDistance', 'enabled', {
	      name: "ShowDragDistance.enable-s",
	      hint: "ShowDragDistance.enable-l",
	      scope: "client",
	      config: true,
	      default: true,
	      type: Boolean
	      //onChange: x => window.location.reload()
	    });
	  	game.settings.register('ShowDragDistance', 'showPathDefault', {
	      name: "ShowDragDistance.showPath-s",
	      hint: "ShowDragDistance.showPath-l",
	      scope: "client",
	      config: true,
	      default: true,
	      type: Boolean
	     // onChange: x => window.location.reload()
	    });
	 	game.settings.register('ShowDragDistance', 'rangeFinder', {
	      name: "ShowDragDistance.rangeFinder-s",
	      hint: "ShowDragDistance.rangeFinder-l",
	      scope: "client",
	      config: true,
	      default: true,
	      type: Boolean
	     // onChange: x => window.location.reload()
	    });
	    ControlsLayer.prototype.drawDragRulers = function() {
		    this.dragRulers = this.addChild(new PIXI.Container());
		    for (let u of game.users.entities) {
		      let dragRuler = new DragRuler(u);
		      this._dragRulers[u._id] = this.dragRulers.addChild(dragRuler);
		    }
		}
		ControlsLayer.prototype.getDragRulerForUser = function(userId) {
		  return this._dragRulers[userId] || null;
		}

		/*Canvas.prototype._onClickLeft = Deselection.patchFunction(
			Canvas.prototype._onClickLeft,
			13,
			"if ( isSelect ) return;",
			`
			if ( isSelect && tool === "target" ) {
				canvas.activeLayer.targetObjects({}, {releaseOthers: true});
				return;
			};
			`
		);*/
		let oldOnDragLeftStart = Token.prototype._onDragLeftStart;
		Token.prototype._onDragLeftStart = function(event){
			console.log('custom _onDragLeftStart', event)
			canvas.controls.dragRuler._onDragStart(event)
			oldOnDragLeftStart.apply(canvas.tokens.controlled[0],[event])
		}
		let oldOnDragLeftMove = Token.prototype._onDragLeftMove;
		Token.prototype._onDragLeftMove = function(event){
			//console.log('custom _onDragLeftMove', event)
			canvas.controls.dragRuler._onMouseMove(event)
			oldOnDragLeftMove.apply(canvas.tokens.controlled[0],[event])
		}
		let oldOnDragLeftCancel = Token.prototype._onDragLeftCancel;
		PlaceableObject.prototype._onDragLeftCancel = function(event){
			console.log('custom _onDragLeftCancel',event)
			event.stopPropagation();
			//if(event.button == 0) {
				console.log( canvas.tokens.controlled[0].mouseInteractionManager.state)
			if(canvas.tokens.controlled.length > 0 ){
				for ( let c of this.layer.preview.children ) {
			      const o = c._original;
			      if ( o ) {
			        o.data.locked = false;
			        o.alpha = 1.0;
			      }
			    }
			    this.layer.preview.removeChildren();
				canvas.controls.dragRuler.moveToken()
				canvas.controls.dragRuler._onMouseUp(event)
				oldOnDragLeftCancel.apply(canvas.tokens.controlled[0],[event])
			}
			//}
		}
		let handleDragCancel = MouseInteractionManager.prototype._handleDragCancel;
		MouseInteractionManager.prototype._handleDragCancel = function(event){

			if(canvas.tokens.controlled.length > 0 && canvas.tokens.controlled[0].mouseInteractionManager.state == 3){
				switch(event.button){
					case 0:
					console.log('test2')
						//console.log(handleDragCancel)
						handleDragCancel.apply(this,[event])
						break;
					case 2:
						console.log('right click')
						canvas.controls.dragRuler._addWaypoint(canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens));
						break;
					default:
						break;
				}
		 	}else{
		 		handleDragCancel.apply(this,[event])
		 	}
		}
	}
}
/*
_handleDragCancel(event) {
    const endState = this.state;
    if ( endState <= this.states.HOVER ) return;

    // Dispatch a cancellation callback
    if ( endState >= this.states.DRAG ) {
      const action = this._dragRight ? "dragRightCancel" : "dragLeftCancel";
      if (CONFIG.debug.mouseInteraction) console.log(`${this.object.constructor.name} | ${action}`);
      
      this.callback(action, event);
    }

    // Continue a multi-click drag workflow if the default event was prevented in the callback
    if ( event.defaultPrevented ) {
      this.state = this.states.DRAG;
      return;
    }

    // Deactivate the drag workflow
    this._deactivateDragEvents();
    this.state = this.states.HOVER;
  }
}
*/
Hooks.on('init', DragRuler.init);
Hooks.on('ready',()=>{
	Object.defineProperty(canvas.controls,'dragRuler',  {
	    get() {
	       return canvas.controls.getDragRulerForUser(game.user._id);
		}}
	);
	canvas.controls.dragRulers = null;
	canvas.controls._dragRulers = {};
	canvas.controls.drawDragRulers();

})
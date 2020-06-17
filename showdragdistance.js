Hooks.once('init', function(){
	
	game.settings.register('ShowDragDistance', 'enabled', {
      name: "ShowDragDistance.enable-s",
      hint: "ShowDragDistance.enable-l",
      scope: "world",
      config: true,
      default: true,
      type: Boolean,
      onChange: x => window.location.reload()
    });
})
/***************************************************************************************************************/
/*


SHOW MEASURED DISTANCE ON TOKEN DRAG

/**
/***************************************************************************************************************/
class DragRuler extends Ruler {
  constructor(user, {color=null}={}){
    super();
    this.dragRuler = this.addChild(new PIXI.Graphics());
    this.ruler = null;
    this.name = `DragRuler.${user._id}`;
    canvas.grid.addHighlightLayer(this.name);
    console.log('test - Drag Ruler created')
  }
   clear() {
    this._state = Ruler.STATES.INACTIVE;
    this.waypoints = [];
    this.dragRuler.clear();
    this.labels.removeChildren().forEach(c => c.destroy());
    canvas.grid.clearHighlightLayer(this.name);
  }
  _onClickLeft(event) {


    if ( (this._state === 2) ) this._addWaypoint(event.data.origin);
  }
  _onDragStart(event) {
    console.log('DragRuler _onDragStart')
    this.clear();
    this._state = Ruler.STATES.STARTING;
    this._addWaypoint(event.data.origin);
  }
 _onMouseMove(event) {
  
    if ( this._state === Ruler.STATES.MOVING ) return;

    // Extract event data
    const mt = event._measureTime || 0;
    const {origin, destination, originalEvent} = event.data;

    // Check measurement distance
    let dx = destination.x - origin.x,
        dy = destination.y - origin.y;
    if ( Math.hypot(dy, dx) >= canvas.dimensions.size / 2 ) {

      // Hide any existing Token HUD
      canvas.hud.token.clear();
      delete event.data.hudState;

      let isCtrl = game.keyboard.isCtrl(event);
      // Draw measurement updates
      if ( Date.now() - mt > 50 ) {
        this.measure(destination, {gridSpaces: !originalEvent.shiftKey},isCtrl);
        event._measureTime = Date.now();
        this._state = Ruler.STATES.MEASURING;
      }
    }
  }
  measure(destination, {gridSpaces=true}={},showPath=false) {
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
      if(showPath){
	      r.lineStyle(6, 0x000000, 0.5).moveTo(ray.A.x, ray.A.y).lineTo(ray.B.x, ray.B.y)
	       .lineStyle(4, this.color, 0.25).moveTo(ray.A.x, ray.A.y).lineTo(ray.B.x, ray.B.y);
   	   }
      // Draw the distance label just after the endpoint of the segment
      if ( label ) {
        label.text = text;
        label.alpha = last ? 1.0 : 0.5;
        label.visible = true;
        let labelPosition = ray.project((ray.distance + 50) / ray.distance);
        label.position.set(labelPosition.x, labelPosition.y);
      }

      // Highlight grid positions
      if(showPath)
     	 this._highlightMeasurement(ray);
    }
    if(showPath){
    // Draw endpoints
	    for ( let p of waypoints ) {
	      r.lineStyle(2, 0x000000, 0.5).beginFill(this.color, 0.25).drawCircle(p.x, p.y, 8);
	    }
	}

    // Return the measured segments
    return segments;
  }
  _highlightMeasurement(ray) {
    const spacer = canvas.scene.data.gridType === CONST.GRID_TYPES.SQUARE ? 1.41 : 1;
    const nMax = Math.max(Math.floor(ray.distance / (spacer * Math.min(canvas.grid.w, canvas.grid.h))), 1);
    const tMax = Array.fromRange(nMax+1).map(t => t / nMax);

    // Track prior position
    let prior = null;

    // Iterate over ray portions
    for ( let [i, t] of tMax.entries() ) {
      let {x, y} = ray.project(t);

      // Get grid position
      let [x0, y0] = (i === 0) ? [null, null] : prior;
      let [x1, y1] = canvas.grid.grid.getGridPositionFromPixels(x, y);
      if ( x0 === x1 && y0 === y1 ) continue;

      // Highlight the grid position
      let [xg, yg] = canvas.grid.grid.getPixelsFromGridPosition(x1, y1);
      canvas.grid.highlightPosition(this.name, {x: xg, y: yg, color: this.color});

      // Skip the first one
      prior = [x1, y1];
      if ( i === 0 ) continue;

      // If the positions are not neighbors, also highlight their halfway point
      if ( !canvas.grid.isNeighbor(x0, y0, x1, y1) ) {
        let th = tMax[i - 1] + (0.5 / nMax);
        let {x, y} = ray.project(th);
        let [x1h, y1h] = canvas.grid.grid.getGridPositionFromPixels(x, y);
        let [xgh, ygh] = canvas.grid.grid.getPixelsFromGridPosition(x1h, y1h);
        canvas.grid.highlightPosition(this.name, {x: xgh, y: ygh, color: this.color});
      }
    }
  }
  _endMeasurement() {
  	console.log('dragRuler _endMeasurement')
    this.clear();
    game.user.broadcastActivity({dragRuler: null});
    tokenDrag = false;
    canvas.mouseInteractionManager.state = MouseInteractionManager.INTERACTION_STATES.HOVER;
  }
  toJSON() {
    return {
      class: "DragRuler",
      name: `DragRuler.${game.user._id}`,
      waypoints: this.waypoints,
      destination: this.destination,
      _state: this._state
    }
  }
   update(data) {
    if ( data.class !== "DragRuler" ) throw new Error("Unable to recreate DragRuler instance from provided data");
    console.log('Dragruler update')
    // Populate data
    this.waypoints = data.waypoints;
    this.destination = data.destination;
    this._state = data._state;

    // Ensure labels are created
    for ( let i=0; i<this.waypoints.length - this.labels.children.length; i++) {
      this.labels.addChild(new PIXI.Text("", CONFIG.canvasTextStyle));
    }

    // Measure current distance
    if ( data.destination ) this.measure(data.destination);
  }
}
var tokenDrag = false;
ControlsLayer.prototype.drawDragRulers = function() {
    this.dragRulers = this.addChild(new PIXI.Container());
    for (let u of game.users.entities) {
      let dragRuler = new DragRuler(u);
      this._dragRulers[u._id] = this.dragRulers.addChild(dragRuler);
    }
  }


  /* -------------------------------------------- */

  /**
   * Get the Ruler display for a specific User ID
   * @param {string} userId
   * @return {Ruler|null}
   */
   Object.defineProperty(ControlsLayer,'._dragRulers',{value:{}})

Token.prototype._onClickLeft = function(event) {
    const tool = game.activeTool;
    const oe = event.data.originalEvent;

    // Add or remove targets
    if ( tool === "target" ) {
      this.setTarget(!this.isTargeted, {releaseOthers: !oe.shiftKey});
    }

    // Add or remove control
    else {
      if ( oe.shiftKey && this._controlled ) return this.release();
      this.layer.hud.clear();
      this.control({releaseOthers: !oe.shiftKey});
    }

    // Dispatch Ruler measurements through to the Canvas
    let isRuler = (tool === "ruler") || ( oe.ctrlKey || oe.metaKey );
    let showDragDistance = game.settings.get('ShowDragDistance','enabled');
    //event.ctrlKey = true;
  
    if ( isRuler ) {
      return canvas.mouseInteractionManager._handleClickLeft(event);
    } else if(showDragDistance){
    	 // event.data.originalEvent.ctrlKey = true;
    	tokenDrag = true;
    	canvas.controls.dragRuler._onDragStart(event);
    }
  }
/* Hook fires on control AND release for some reason so we have to check if it's controlled */
// Hooks.on('controlToken', function(token){
// 	console.log('test',token._controlled)
// 	if(token._controlled){
// 		tokenDrag = true;
// 		token.on('mousedown',function(event){
// 			console.log('mousedown')
// 			//event.data.originalEvent.ctrlKey = true;
// 			const isCtrl = game.keyboard.isCtrl(event);
// 			if(!isCtrl){
// 				event.data.origin = token.center;
// 	    		tokenDrag = true;
// 	    	 	canvas.controls.dragRuler._onDragStart(event);
// 	    	 }
// 		});
// 		token.on('mouseup',function(event){
// 			console.log('control mouseup')
// 		})
// 	}else{
// 		tokenDrag = false;
// 		token.off('mousedown');
// 		token.off('mouseup');
// 	}
	
// })
Hooks.on('preUpdateToken', function(){
	if(tokenDrag){
		tokenDrag = false;
		canvas.controls.dragRuler._endMeasurement();
	}
})
ControlsLayer.prototype.getDragRulerForUser = function(userId) {
	return this._dragRulers[userId] || null;
}
/***************************************************************************************************************/

Hooks.on('ready', function (){
	console.log("SDD Ready")
	canvas.controls.dragRulers = null;
	canvas.controls._dragRulers = {};
	canvas.controls.drawDragRulers();
	Object.defineProperty(canvas.controls,'dragRuler',  {
		get() {
	  		return canvas.controls.getDragRulerForUser(game.user._id);
	}});

	

})
Hooks.on('canvasReady',function(){
	console.log('SDD canvasReady');
	canvas.controls.dragRulers = null;
	canvas.controls._dragRulers = {};
	canvas.controls.drawDragRulers();;
	canvas.stage.on('mousemove', function(e){
		
		if(tokenDrag){
			
			e.data.destination = e.data.getLocalPosition(canvas.activeLayer);
			canvas.controls.dragRuler._onMouseMove(e);
			//console.log('SDD Mousemove',e)
		}
		
	});
	
})
Hooks.on('init',()=>{
	console.log("SDD INIT")
})
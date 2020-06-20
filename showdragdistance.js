Hooks.once('init', function(){
	
	game.settings.register('ShowDragDistance', 'enabled', {
      name: "ShowDragDistance.enable-s",
      hint: "ShowDragDistance.enable-l",
      scope: "world",
      config: true,
      default: true,
      type: Boolean
      //onChange: x => window.location.reload()
    });
  game.settings.register('ShowDragDistance', 'showPathDefault', {
      name: "ShowDragDistance.showPath-s",
      hint: "ShowDragDistance.showPath-l",
      scope: "world",
      config: true,
      default: true,
      type: Boolean
     // onChange: x => window.location.reload()
    });
  game.settings.register('ShowDragDistance', 'rangeFinder', {
      name: "ShowDragDistance.rangeFinder-s",
      hint: "ShowDragDistance.rangeFinder-l",
      scope: "world",
      config: true,
      default: true,
      type: Boolean
     // onChange: x => window.location.reload()
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
    
    this.clear();
    this._state = Ruler.STATES.STARTING;
    this._addWaypoint(event.data.origin);
  }
 _onMouseMove(event,rangeFinder=false,instant= false) {
  
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

      //If Show Path by Default is set, path is shown and ctrl hides.
      let showPath = true;
      let isCtrl = game.keyboard._downKeys.has('Control'); 
      if(game.settings.get('ShowDragDistance','showPathDefault')==false){
        if(isCtrl)
          showPath= true;
        else
          showPath = false;
      }else{
        if(isCtrl)
          showPath= false;
        else
          showPath = true;
      }
      if(rangeFinder)
        showPath = true;
     
      // Draw measurement updates
      if ( Date.now() - mt > 50  || instant) {
        this.measure(destination, {gridSpaces: !originalEvent.shiftKey},showPath);
        event._measureTime = Date.now();
        this._state = Ruler.STATES.MEASURING;
      }
    }
  }
  _onMouseUp(event) {
   const oe = event.data.originalEvent;
   const isCtrl = oe.ctrlKey || oe.metaKey;
   if ( !isCtrl ) 
      this._endMeasurement();
  }
  measure(destination, {gridSpaces=true}={},showPath=true) {
   
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
      if(this.waypoints.length > 1)
        s.text = this._getSegmentLabel(d, totalDistance, s.last);
      else
        s.text = this._getSegmentLabel(d, s.last);
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
      if ( label && game.settings.get('ShowDragDistance','enabled')) {
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
    this.clear();
    canvas.controls.ruler.clear();
    canvas.controls.dragRuler.clear();
    game.user.broadcastActivity({dragRuler: null});
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
  _onKeyDown(e) {
  
  }
}
var tokenDrag = false;
var defaultDrag = false;
var rangeFinder = false;
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
//This wasn't necessary after all, because canvas.tokens.controlled is populated by browser, its' not global, but whatever.
Token.prototype.controller = null;

/* Hook fires on control AND release for some reason so we have to check if it's controlled */


/***************************************************************************************************************/


var dragToken = (e) =>{
  //Token is being dragged
  
  if(canvas.tokens.preview.children.length > 0){
    if(canvas.controls.dragRuler.active === false){
      //HIDES TOKEN TOOLTIP FROM VTTA-PARTY module
      if(canvas.stage.getChildByName('Tooltip') != null && game.user.isGM)
        canvas.stage.getChildByName('Tooltip').visible = false;
      canvas.controls.dragRuler._onDragStart(e);
    }else {
      canvas.controls.dragRuler._onMouseMove(e);
    }
  }
  if(canvas.controls.ruler.active && rangeFinder){
    e.data.destination = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
    e.data.origin = canvas.tokens.controlled['0'].center;
    canvas.controls.ruler._onMouseMove(e)
  }
}
var rangeFinder = false;
var ctrlPressed= false;
var keyDown = (e) =>{

 e.data = {origin:{},destination:{},originalEvent:e}
  if(e.which == 17){ //CTRL KEY 

    if(canvas.controls.dragRuler.active){  //Hides/Shows path while dragging.
      
      if(!ctrlPressed){
        ctrlPressed = true;
        e.data = {}
        e.data = {origin:{},destination:{},originalEvent:e}
        e.data.destination = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
        e.data.origin = canvas.tokens.controlled['0'].center;
        canvas.controls.dragRuler.measure(e.data.destination,{gridSpaces: !e.data.originalEvent.shiftKey}, !game.settings.get('ShowDragDistance','showPathDefault'));
      }
    }else{
      //RANGE FINDER
      if(game.settings.get('ShowDragDistance','rangeFinder') && canvas.tokens.controlled.length == 1 && !dragOverride){
        //We have to fake our event data.
        e.data = {origin:{},destination:{},originalEvent:e}
        e.data.destination = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
        e.data.origin = canvas.tokens.controlled['0'].center;
        if(!ctrlPressed){
          rangeFinder = true;
          ctrlPressed = true;
          //Draws initial line on press, otherwise user has to move mouse to get line to draw
          canvas.controls.ruler._onDragStart(e);
          canvas.controls.ruler._onMouseMove(e)
        }
      }
    }
  }
}
var keyUp = (e) =>{
  //Hides/shows path while dragging token
  if(e.which == 17){
    if(ctrlPressed){
      ctrlPressed = false;
      if(canvas.controls.dragRuler.active){
        e.data = {origin:{},destination:{},originalEvent:e}
        e.data.destination = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
        e.data.origin = canvas.tokens.controlled['0'].center;
        canvas.controls.dragRuler.measure(e.data.destination,{gridSpaces: !e.data.originalEvent.shiftKey}, game.settings.get('ShowDragDistance','showPathDefault'));
      }else if(canvas.controls.ruler.active && !dragOverride){ 
        //RANGE FINDER

        if(game.settings.get('ShowDragDistance','rangeFinder') === true){
           e.data = {origin:{},destination:{},originalEvent:e}
          e.data.destination = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
          e.data.origin = canvas.tokens.controlled['0'].center;
          rangeFinder = false;
          
          canvas.controls.ruler._onMouseUp(e);
          canvas.controls.ruler._endMeasurement();
        }
      }
    }
  }else{
      
      
  }
}
Hooks.on('init',()=>{

});
Hooks.on('ready', function (){

 

})
Hooks.on('canvasReady',(t)=>{
  canvas.controls.dragRulers = null;
 canvas.controls._dragRulers = {};
 canvas.controls.drawDragRulers();
 Object.defineProperty(canvas.controls,'dragRuler',  {
   get() {
       return canvas.controls.getDragRulerForUser(game.user._id);
 }});


});
var dragOverride = false;
var tokenClick = (e) =>{
  
  let isCtrl = game.keyboard.isCtrl(e)
  if(isCtrl){
 
    dragOverride = true;
  }else
    dragOverride = false;
}
Hooks.on('controlToken', (token,controlled)=>{
  

  token.controller = (controlled) ? game.userId:null;

  if(controlled & canvas.tokens.controlled.length === 1){
   
    canvas.stage.on('mousemove',dragToken)
  } else {
    token.off('mousedown',tokenClick)
    canvas.stage.off('mousemove',dragToken)
  }
})
Hooks.on('updateToken',()=>{
 
  canvas.controls.dragRuler._endMeasurement();
  dragOverride = false;

 
 
})

Hooks.on('hoverToken',(token,hover)=>{
  if(token == canvas.tokens.controlled[0] && !hover && !dragOverride){
    canvas.controls.dragRuler._endMeasurement();
  }
  if(hover){
    //Show VTTA hover
    if(canvas.stage.getChildByName('Tooltip') != null && game.user.isGM)
      canvas.stage.getChildByName('Tooltip').visible = true;
    token.on('mousedown',tokenClick)
   }else{
     token.off('mousedown',tokenClick)
   }
})
window.addEventListener('click',(e)=>{
  if(!e.ctrlKey)
    dragOverride = false;
})
 window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
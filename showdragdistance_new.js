let originalPODragCancel = PlaceableObject.prototype._onDragLeftCancel;
let func;
let dragging = false;
function test(){
	console.log('test function')
}
Hooks.on('init',()=>{
	CONFIG.debug.hooks = true;
	CONFIG.debug.mouseInteraction = true;
//	originalDragCancel = PlaceableObject._onDragLeftCancel;
	console.log('test',originalPODragCancel)
});
// PlaceableObject.prototype._createInteractionManager = function(){

// }
function addWaypoint(point) {
	console.log(point)
	const center = canvas.grid.getCenter(point.x, point.y);
	console.log('center',center)
	canvas.controls.ruler.waypoints.push(new PIXI.Point(center[0], center[1]));
	canvas.controls.ruler.labels.addChild(new PIXI.Text("", CONFIG.canvasTextStyle));
}
function onMouseMove(event) {
	if ( canvas.controls.ruler._state === Ruler.STATES.MOVING ) return;

	// Extract event data
	const mt = event._measureTime || 0;
	event.data.destination = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
	const {origin, destination, originalEvent} = event.data;

	//console.log(origin,destination)
	// Check measurement distance
	let dx = destination.x - origin.x,
	    dy = destination.y - origin.y;
	if ( Math.hypot(dy, dx) >= canvas.dimensions.size / 2 ) {

	  // Hide any existing Token HUD
	  canvas.hud.token.clear();
	  delete event.data.hudState;

	  // Draw measurement updates
	  if ( Date.now() - mt > 50 ) {
	    measure(destination, {gridSpaces: !originalEvent.shiftKey});
	    event._measureTime = Date.now();
	    canvas.controls.ruler._state = Ruler.STATES.MEASURING;
	  }
	}
}
function measure(destination, {gridSpaces=true}={}) {
	destination = new PIXI.Point(...canvas.grid.getCenter(destination.x, destination.y));
	const waypoints = canvas.controls.ruler.waypoints.concat([destination]);
	const r = canvas.controls.ruler.ruler;
	canvas.controls.ruler.destination = destination;

	// Iterate over waypoints and construct segment rays
	const segments = [];
	for ( let [i, dest] of waypoints.slice(1).entries() ) {
	  const origin = waypoints[i];
	  const label = canvas.controls.ruler.labels.children[i];
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
	  s.text = canvas.controls.ruler._getSegmentLabel(d, totalDistance, s.last);
	}

	// Clear the grid highlight layer
	const hlt = canvas.grid.highlightLayers[canvas.controls.ruler.name];
	hlt.clear();

	// Draw measured path
	r.clear();
	for ( let s of segments ) {
	  const {ray, label, text, last} = s;

	  // Draw line segment
	  r.lineStyle(6, 0x000000, 0.5).moveTo(ray.A.x, ray.A.y).lineTo(ray.B.x, ray.B.y)
	   .lineStyle(4, canvas.controls.ruler.color, 0.25).moveTo(ray.A.x, ray.A.y).lineTo(ray.B.x, ray.B.y);

	  // Draw the distance label just after the endpoint of the segment
	  if ( label ) {
	    label.text = text;
	    label.alpha = last ? 1.0 : 0.5;
	    label.visible = true;
	    let labelPosition = ray.project((ray.distance + 50) / ray.distance);
	    label.position.set(labelPosition.x, labelPosition.y);
	  }

	  // Highlight grid positions
	 highlightMeasurement(ray);
	}

	// Draw endpoints
	for ( let p of waypoints ) {
	  r.lineStyle(2, 0x000000, 0.5).beginFill(canvas.controls.ruler.color, 0.25).drawCircle(p.x, p.y, 8);
	}

	// Return the measured segments
	return segments;
}
function highlightMeasurement(ray) {
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
      canvas.grid.highlightPosition(canvas.controls.ruler.name, {x: xg, y: yg, color: canvas.controls.ruler.color});

      // Skip the first one
      prior = [x1, y1];
      if ( i === 0 ) continue;

      // If the positions are not neighbors, also highlight their halfway point
      if ( !canvas.grid.isNeighbor(x0, y0, x1, y1) ) {
        let th = tMax[i - 1] + (0.5 / nMax);
        let {x, y} = ray.project(th);
        let [x1h, y1h] = canvas.grid.grid.getGridPositionFromPixels(x, y);
        let [xgh, ygh] = canvas.grid.grid.getPixelsFromGridPosition(x1h, y1h);
        canvas.grid.highlightPosition(canvas.controls.ruler.name, {x: xgh, y: ygh, color: canvas.controls.ruler.color});
      }
    }
}
/************ EMD RULER FUNCTIONS **********/
/*********** TOKEN FUNCTIONS **************/

//Destroy token clone.
function dragLeftCancel(event,token) {
    console.log('Custom _onDragLeftCancel')
    for ( let c of token.layer.preview.children ) {
      const o = c._original;
      if ( o ) {
        o.data.locked = false;
        o.alpha = 1.0;
      }
    }
    token.layer.preview.removeChildren();
  }



/*********** END TOKEN FUNCTIONS *************/
PlaceableObject.prototype._onDragLeftCancel = function(event){
	console.log('overwritten');
	 originalPODragCancel.apply(this,arguments)
}
let myCancelLeftDrag = (e)=>{
	console.log('my cancel left drag')
}
Hooks.on('canvasReady',(t)=>{

});
let clones;
let tokenHover = false;
let tokenMouseDown = false;
Hooks.on('hoverToken', (token,hover)=>{
	console.log(token,hover)
	if(hover){
		tokenHover = true;
		console.log(token.actor.data.data.attributes.speed)
		
	/*********************  Right Click on Canvas *************************/
		$('body').on('keydown',(e)=>{
			
			if(e.which==88 && dragging){
				console.log(e.which)
				canvas.controls.ruler._removeWaypoint(canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens))
			}
		})
		$('body').on('contextmenu',(e)=>{
			console.log('contextmenu')
			if(dragging){
				addWaypoint(canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens));
			}
		})
	/*********************************************************************/
		canvas.stage.on('pointerup',(e)=>{
			console.log('button:',e.data.button)
			switch(e.data.button){
				case 0:
					//canvas.stage.off('mousemove');
					//Deletes Preview
					if(dragging){
						token.off('pointermove')
						dragLeftCancel(e,token)
						canvas.controls.ruler.moveToken();
						clones= [];
						dragging = false;
					}
					//canvas.controls.ruler._endMeasurement();
					break;
				case 2:
				console.log('test')
					if(dragging){
						
					}
					break;
				default:
					break;
			}
		})
		
		token.on('pointerdown',(e)=>{
			e.stopPropagation();
			console.log(e);
			const oe = e.data.originalEvent;
			//console.log(e.data.origin,token._canControl(game.user,e))
			
			switch(e.data.button){
				case 0:
					tokenMouseDown = true;
					if(token._canControl(game.user,e)){
						//token.control({releaseOthers: !oe.shiftKey});
					}
					break;
				default:
				break;
			}

		});
		canvas.stage.on('pointerup',(e)=>{
			tokenMouseDown = false;
			switch(e.data.button){
				case 0:
					dragging = false;
					break;
				default:
					break;
			}
			console.log('tokenMouseDown:',tokenMouseDown)
		})
		tokenHover = true;
	
		
		token.on('pointerdown',(e)=>{
			e.stopPropagation();
			console.log(e);
			const oe = e.data.originalEvent;
			console.log(e.data.origin,token._canControl(game.user,e))
			if(token._canControl(game.user,e)){
				token.control({releaseOthers: !oe.shiftKey});
			}
			switch(e.data.button){
				case 0:
					console.log('LeftDown')
					
					canvas.controls.ruler._state = Ruler.STATES.STARTING;
					
					addWaypoint(canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens));
					token.mouseInteractionManager._activateDragEvents();
					
					
					token.on('pointermove',(e)=>{
						// 	e.stopPropagation();
					 	//console.log(token.mouseInteractionManager.state)
					 	
					 	onMouseMove(e);
						//console.log(canvas.controls.ruler._state)
						if(!dragging){
							dragging = true;
						 	const targets = token.layer.options.controllableObjects ? token.layer.controlled : [token];
						    clones = [];
						    for ( let o of targets ) {
						      if ( o.data.locked ) continue;
						      o.data.locked = true;

						      // Clone the object
						      const c = o.clone();
						      clones.push(c);

						      // Draw the clone
						      c.draw().then(c => {
						        o.alpha = 0.4;
						        c.alpha = 0.8;
						        c.visible = true;
						        token.layer.preview.addChild(c);
						      });
						    }
						    //event.data.clones = clones;
							//token.mouseInteractionManager.handlers.contextmenu = test();
						}else{
							const {destination, origin, originalEvent} = e.data;

						    // Pan the canvas if the drag event approaches the edge
						    canvas._onDragCanvasPan(originalEvent);

						    // Determine dragged distance
						    const dx = destination.x - origin.x;
						    const dy = destination.y - origin.y;

						    // Update the position of each clone
						    for ( let c of clones || [] ) {
						      c.data.x = c._original.data.x + dx;
						      c.data.y = c._original.data.y + dy;
						      c.refresh();
						    }
						}
					 	//console.log(e);
					 })
					break;
				case 2:
					e.stopPropagation();
					console.log('RightDown')
					break;
				default:
					break;
			}

		})
		
	}else{
		$('body').off('mousedown');
		token.off('pointerdown')
		canvas.stage.off('pointerdown')
	}
})
// Hooks.on('controlToken',(token,controlled)=>{

// 	if(controlled){
// 		if(tokenMouseDown){
// 			token.on('pointermove',(e)=>{
// 			// 	e.stopPropagation();
// 		 	//console.log(token.mouseInteractionManager.state)
		 	
// 		 	onMouseMove(e);
// 			//console.log(canvas.controls.ruler._state)
// 			if(!dragging){
// 				dragging = true;
// 			 	const targets = token.layer.options.controllableObjects ? token.layer.controlled : [token];
// 			    clones = [];
// 			    for ( let o of targets ) {
// 			      if ( o.data.locked ) continue;
// 			      o.data.locked = true;

// 			      // Clone the object
// 			      const c = o.clone();
// 			      clones.push(c);

// 			      // Draw the clone
// 			      c.draw().then(c => {
// 			        o.alpha = 0.4;
// 			        c.alpha = 0.8;
// 			        c.visible = true;
// 			        token.layer.preview.addChild(c);
// 			      });
// 			    }
// 			    //event.data.clones = clones;
// 				//token.mouseInteractionManager.handlers.contextmenu = test();
// 			}else{
// 				const {destination, origin, originalEvent} = e.data;

// 			    // Pan the canvas if the drag event approaches the edge
// 			    canvas._onDragCanvasPan(originalEvent);

// 			    // Determine dragged distance
// 			    const dx = destination.x - origin.x;
// 			    const dy = destination.y - origin.y;

// 			    // Update the position of each clone
// 			    for ( let c of clones || [] ) {
// 			      c.data.x = c._original.data.x + dx;
// 			      c.data.y = c._original.data.y + dy;
// 			      c.refresh();
// 			    }
// 			}
// 		 	//console.log(e);
// 		 })
// 		}
// 		console.log(tokenMouseDown)
		

// 	}else{

// 	}
// })
$(document).on('ready',(e)=>{

})

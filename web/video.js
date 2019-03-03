/* Try to add mousewheel zoom from: http://blogs.sitepointstatic.com/examples/tech/mouse-wheel/index.HTML . See my attempt at ~/Downloads/rotatezoomHTML5video . Better than this would be zooming in at the cursor's position. 
 * 
 * The idea is that if debug is set is the cs code, there will be extra controls that let the user manually zoom and position the video, and upon clicking a button, output into a div, cs code to render the video that way. You can zoom in on certain parts. Specify start and end points. Also pan and playbackRate.
 *
 * Also, save the starting and ending zoom and position, enabling it to be applied to a different time in the video.
 *
 * Strange: I set playbackRate to .2, but it's .25.
 *
 * Another thing to do: Add a function that makes HTML for links or buttons that do certain transformations (on certain ranges). These can be supplied as a string to another show video function that adds them below the video. Add hotkeys to do these buttons.
 *
 * A parameter to above function grays out the button when that range has played completely. (But button can still be pressed.)
 *
 * Another parameter determines what happens when a section is completed: autoloop or go to next section. Some sections don't have buttons and can only be gotten to by completing the previous section. (Disallow for looping sections.)
 *
 * FIX: If rate goes below 1, doesn't seem to slow down enough.
 *
 * There seem to be bugs in firefox: if start and no end with autoplay and loop, it just autoplays and loops the whole thing. I added an "end" and it started at the beginning, then stopped at the "end". (So it didn't loop and did start at "start".) Then I took off autoplay, and it started and ended at the right place but didn't loop. I haven't tried this in other browsers yet. This was just local, not over the Internet. I'm thinking about using just the transformVideo() function, not params to the video tag. 
 *
 * TODO:
 *
 * 1. Make showVideo function with all starts together and all ends together.
 *
 * 2. Add buttons to adjust playbackRate.
 *
 * 11. Get rid of px in outputDate
 *
 * 12. Round everything off.
 *
 * 13. Nudge should go all the way to the end or beginning.
 *
 * 14. Ability to load as showVideo parms into videoEditor. (Option to be beginning or end.)
 *
 * 3. Hotkeys.
 *
 * 5. Frame- button now on next line. Fix.
 *
 * 7. I put in data I'd created with the editor into the showVideo function, and it seemed to work, but doesn't loop, just freezes at frame zero, which is not in the specified range. Reduced start and end times to one decimal and this fixed it, but one iteration of the loop it didn't respect them.
 *
 * 9. Upload and test over net.
 *
 * 10. Try with sound.
 *
 * 4. Draggable slider.
 *
 * 16. Reset button also resets speed. Should it reset the rest too, i.e. start, end?
 *
 * 6. Why does it sometimes show the first frame for a moment when looping?
 *
 * 8. Pauses at end before looping. Can this be fixed? Maybe if zoom, rate, etc, don't change, then no need to call those commands. If just simple loop, everything the same, might be faster without them.
 *
 * 15. Support for other video formats and fallback.
 *
 * 17. Large video file was choppy and then paused itself and did not start up. Might have worked if bitbucket.io was configured for byte range requests, but it is not. It does give the right type (video/mp4), and the video should be web optimized (has moov near the beginning). See: https://stackoverflow.com/questions/10328401/html5-how-to-stream-large-mp4-files . Maybe need to preload (http://dinbror.dk/blog/how-to-preload-entire-html5-video-before-play-solved/):
 *
 *Solution #4, ajax and bloburl (works)

You can force the browser to download a video by making a GET request to the video url. If the response type is blob you can afterwards create an object URL. The URL lifetime is tied to the document in the window on which it was created so you can set it as source on the video player. And voila you now have a video player with a entirely preloaded video:

var req = new XMLHttpRequest();
req.open('GET', 'video.mp4', true);
req.responseType = 'blob';

req.onload = function() {
   // Onload is triggered even on 404
   // so we need to check the status code
   if (this.status === 200) {
      var videoBlob = this.response;
      var vid = URL.createObjectURL(videoBlob); // IE10+
      // Video is now downloaded
      // and we can set it as source on the video element
      video.src = vid;
   }
}
req.onerror = function() {
   // Error
}

req.send();
Notes:
createObjectURL() is supported from IE10+. Be aware that each time you call createObjectURL(), a new object URL is created, even if you’ve already created one for the same object [source].

Because we making a ajax request you might need to handle CORS!
 * 
 * 18. But... on bitbucket, each choice causes long pause. Maybe <video> element is being reloaded? Try putting in own div with choices calling *script's that execute DOM commands to the video. See: https://imelgrat.me/javascript/control-html5-audio-video-javascript-api/
 */

// Object that holds global variables for the video 
var velt = {
	videoElement:null,
	autoplay:true,
	loop:true,
	videoElementStart:0,
	videoElementEnd:0,
	startRate:1,
	endRate:1,
	startScale:1, 
	endScale:1, 
	startx:null, starty:null, endx:null, endy:null,
	// doSomethingEach:.01,  Don't use anymore
	browserTransform:null,
	videoHeight:0,
	videoWidth:0,
	seekStart:0,
	seekEnd:0
}

function setBrowserTransform() {
/* Return which css transformation property the current browser supports. This function requires velt.videoElement to already be set to the video tag on the page. */
	var properties = ['transform', 'WebkitTransform', 'MozTransform',
					  'msTransform', 'OTransform'];
	var prop = properties[0];
	for(var i=0,j=properties.length;i<j;i++){
	  if(typeof velt.videoElement.style[properties[i]] !== 'undefined'){
		prop = properties[i];
		break;
	  }
	}
	return prop;
}

var transformVideo = function() {
/* Apply various changes to the video at the appropriate time: Restart it if it has reached the end (which could be the actual end or the end mark) if autoplay is set. Change the zoom, position, or speed. */
	var curTime = velt.videoElement.currentTime;
	var rate = velt.videoElement.playbackRate;
	var length = velt.videoElementEnd - velt.videoElementStart;

	// otime is "old time," i.e. the time this function was last called
	if ( typeof transformVideo.otime == 'undefined' || transformVideo.otime == 0) { // This check for otime being zero is a hack. It shouldn't happen, but I can't figure out why it is.
		transformVideo.otime = curTime;
		transformVideo.x = velt.startx;
		transformVideo.y = velt.starty;
	}

	if ( typeof transformVideo.scale == 'undefined' ) {
		transformVideo.scale = velt.startScale;
	}

//	console.log('o: '+transformVideo.otime+', c: '+curTime);
	if(curTime > transformVideo.otime + .04) {  // 40 ms is around 24 FPS, yes? Only do the transformations if 40 has passed.
		// Set elapsed and fraction (% of segment that has elapsed). 
		var elapsed = curTime - transformVideo.otime;
		var fraction = elapsed / length;

		// Set new rate
		if(velt.endRate != velt.startRate) {
			var rateChange = velt.endRate - velt.startRate;
			velt.videoElement.playbackRate += rateChange * fraction;
		}

		//console.log('o: '+transformVideo.otime+', c: '+curTime+', e: '+elapsed+', f: '+fraction+', rc: '+rateChange+'rate: '+rate+'->'+velt.videoElement.playbackRate);
	//	console.log('scale: '+transformVideo.scale);
		
		// Set new scale
		if(velt.endScale != velt.startScale) {
			var scaleChange = velt.endScale - velt.startScale;
			transformVideo.scale += scaleChange * fraction;
			velt.videoElement.style[velt.browserTransform] = 'scale('+transformVideo.scale+')';
		}

		// Set new position
		if(velt.endx != velt.startx || velt.endy != velt.starty) {
			var xChange = (velt.endx - velt.startx) * fraction;
			var yChange = (velt.endy - velt.starty) * fraction;

			//console.log(transformVideo.x+' x '+transformVideo.y);
			//console.log('x: '+velt.endx+', '+velt.startx+', delta: '+xChange);
			//console.log('y: '+velt.endy+', '+velt.starty+', delta: '+yChange);
			if(xChange != 0) {
				transformVideo.x += xChange;
				velt.videoElement.style.left = parseInt(transformVideo.x, 10) + 'px';
			}
			if(yChange != 0) {
				transformVideo.y += yChange;
				velt.videoElement.style.top = parseInt(transformVideo.y, 10) + 'px';
			}
		}
		
		// Set otime (Should this be the time at the start or end of this function?)
		//	transformVideo.otime = velt.videoElement.currentTime;
		transformVideo.otime = curTime;
	}

	//console.log(curTime+' ('+velt.videoElementEnd+':'+velt.videoElement.seekable.end(0)+') '+velt.loop);
	// Restart video if reached end marker and loop is true
	if ((curTime >= velt.videoElementEnd) && velt.loop) {
		velt.videoElement.currentTime = velt.videoElementStart;
		transformVideo.otime = velt.videoElementStart;
		//console.log(transformVideo.otime);
		velt.videoElement.playbackRate = velt.startRate;
		velt.videoElement.style[velt.browserTransform] = 'scale('+velt.startScale+')';
		transformVideo.scale = velt.startScale;
		velt.videoElement.style.top = velt.starty + 'px'; 
		velt.videoElement.style.left = velt.startx + 'px'; 
		velt.videoElement.play();
	}

	transformVideo.requestID = requestAnimationFrame(transformVideo);
}

/* What these function names mean:
 *
 * a = autoplay
 * l = loop
 * c = controls
 *
 * Latest/greatest is showVideo2_[alc]+, as it allows optional pan and zoom. You have to put in the rate, scale, and x/y offsets, but can leave out the second set if there's no pan/zoom. It puts the video at the top of the page above any text.
 *
 */

function showVideoAtTop_alc(thevideo) {
// Simple function to place video at the top of the game's text. Autoplays and loops. Has controls.
	showVideo(thevideo, true, true, true);
}

function showVideoAtTop_a(thevideo) {
	showVideo(thevideo, true, false, false);
}

function showVideoAtTop_l(thevideo) {
	showVideo(thevideo, false, true, false);
}

function showVideoAtTop_c(thevideo) {
	showVideo(thevideo, false, false, true);
}

function showVideoAtTop_lc(thevideo) {
	showVideo(thevideo, false, true, true);
}

function showVideoAtTop_al(thevideo) {
	showVideo(thevideo, true, true, false);
}

function showVideoAtTop_ac(thevideo) {
	showVideo(thevideo, true, false, true);
}

function showVideoAtBottom_alc(thevideo) {
	showVideo(thevideo, true, true, true, 1);
}

function showVideoAtBottom_a(thevideo) {
	showVideo(thevideo, true, false, false ,1);
}

function showVideoAtBottom_l(thevideo) {
	showVideo(thevideo, false, true, false ,1);
}

function showVideoAtBottom_c(thevideo) {
	showVideo(thevideo, false, false, true ,1);
}

function showVideoAtBottom_lc(thevideo) {
	showVideo(thevideo, false, true, true ,1);
}

function showVideoAtBottom_al(thevideo) {
	showVideo(thevideo, true, true, false ,1);
}

function showVideoAtBottom_ac(thevideo) {
	showVideo(thevideo, true, false, true ,1);
}

function showVideoAtTop_seg_alc(thevideo, start, end) {
	showVideo(thevideo, true, true, true, 0, start, end);
}

function showVideoAtTop_rate_alc(thevideo, playbackRate) {
	showVideo(thevideo, true, true, true, 0, 0, 0, playbackRate, playbackRate);
}

function showVideoAtTop_cRate_alc(thevideo, startRate, endRate) {
	showVideo(thevideo, true, true, true, 0, 0, 0, startRate, endRate);
}

function showVideoAtTop_seg_rate_alc(thevideo, start, end, playbackRate) {
	showVideo(thevideo, true, true, true, 0, start, end, playbackRate, playbackRate);
}

function showVideoAtTop_seg_cRate_alc(thevideo, start, end, startRate, endRate) {
	showVideo(thevideo, true, true, true, 0, start, end, startRate, endRate);
}

function showVideo2_al(thevideo, start, end, startRate, startScale, startx, starty, endRate=null, endScale=null, endx=null, endy=null) {
	if (!endRate) endRate = startRate;
	if (!endScale) endScale = startScale;
	if (!endx) endx = startx;
	if (!endy) endy = starty;
	showVideo(thevideo, true, true, false, 0, start, end, startRate, endRate, startScale, endScale, startx, starty, endx, endy);
}

function showVideo2_a(thevideo, start, end, startRate, startScale, startx, starty, endRate=null, endScale=null, endx=null, endy=null) {
	if (!endRate) endRate = startRate;
	if (!endScale) endScale = startScale;
	if (!endx) endx = startx;
	if (!endy) endy = starty;
	showVideo(thevideo, true, false, false, 0, start, end, startRate, endRate, startScale, endScale, startx, starty, endx, endy);
}

function showVideo2_ac(thevideo, start, end, startRate, startScale, startx, starty, endRate=null, endScale=null, endx=null, endy=null) {
	if (!endRate) endRate = startRate;
	if (!endScale) endScale = startScale;
	if (!endx) endx = startx;
	if (!endy) endy = starty;
	showVideo(thevideo, true, false, true, 0, start, end, startRate, endRate, startScale, endScale, startx, starty, endx, endy);
}

// And so on... Make more such functions as needed.

function showVideo(thevideo, autoplay=true, loop=true, controls=false, topBottom=0, start=0, end=0, startRate=1, endRate=1, startScale=1, endScale=1, startx=null, starty=null, endx=null, endy=null) {
/* Master function called by above wrapper functions. This master function has parms for everything that can be done to the video. Should error-check these parms. 
 *
 * Adds video tag (with stage div) to the game's text, above if topBottom is set to 0 and below if topBottom is anything else. Initializes global object for the video, velt. Sets the animation (transformations) to run.
*/
	
// Stop the animation if running already, i.e. showVideo is being called again. This is to prevent it from running before new video is fully setup. Probably not necessary.
if (transformVideo.requestId) {
   window.cancelAnimationFrame(transformVideo.requestId);
   transformVideo.requestId = undefined;
}

console.log("NEW VIDEO");
	
	// If run a second time, need to reset these.
	if(transformVideo.otime)
		if (!(delete transformVideo.otime)) console.log("Error deleting transformVideo.otime"); // Seems to not work? Well, it fixed one thing, but not another. It fixed it when time didn't reset, so transformations didn't occur until far later, but it's not fixing it when otime is wrongly zero for a reason I cannot yet determine.
	if(transformVideo.scale)
		if (!(delete transformVideo.scale)) console.log("Error deleting transformVideo.scale");
	
	// Set parm vars
	var autoplayText, loopText, controlsText, startEndText, endText;

	if (autoplay) autoplayText = 'autoplay ';
	else autoplayText = '';

	if (loop) {
//		loopText = 'loop ';
		loopText = '';
		velt.loop = true;
	}
	else {
		loopText = '';
		velt.loop = false;
	}

	if (controls) controlsText = 'controls ';
	else controlsText = '';

	if (!(start == 0 && end == 0)) {
		if (end == 0) {
			endText = '';
		} else endText = end;

		startEndText = '#t='+start+','+endText;
	} else {
		startEndText = '';
	}

	// Add video tag to existing HTML of the main text div
	var videotag = '<div class="stage" id="stage" style="position:relative;overflow:hidden;"><video class="video-js" style="position:absolute;top:0;left:0;" '+autoplayText+loopText+controlsText+' preload="auto" data-setup="{}"> <source src="'+thevideo+startEndText+'"> Your browser does not support the video tag.  </video></div>';

	//alert(videotag);

	var mainText = document.getElementById("text");

	if (topBottom == 0)
		mainText.innerHTML = videotag + mainText.innerHTML;
	else
		mainText.innerHTML = mainText.innerHTML + videotag;

	// Fill basic velt properties (some set later)
	velt.videoElementStart = start; // Might change in loadedmetadata event
	velt.videoElementEnd = end; // Might change in loadedmetadata event
	velt.startRate = startRate;
	velt.endRate = endRate;
	velt.startScale = startScale; 
	velt.endScale = endScale; 
	velt.startx = startx; 
	velt.starty = starty; 
	velt.endx = endx; 
	velt.endy = endy;

	// Adjust the video tag's properties
	velt.videoElement = document.getElementsByTagName("video")[0];
	// velt.videoElement.addEventListener('timeupdate', transformVideo, false);   Using requestAnimationFrame now.

	velt.videoElement.addEventListener('loadedmetadata', function() {
		var seekableStart = velt.videoElement.seekable.start(0),
			seekableEnd = velt.videoElement.seekable.end(0);

		if(velt.videoElementStart < seekableStart) velt.videoElementStart = seekableStart;
		else if(velt.videoElementStart > seekableEnd) velt.videoElementStart = seekableStart; // Maybe throw error here is better?

		if(velt.videoElementEnd < seekableStart) velt.videoElementEnd = seekableEnd;  // Maybe throw error here is better?
		else if(velt.videoElementEnd > seekableEnd) velt.videoElementEnd = seekableEnd; 
		else if(velt.videoElementEnd == 0) velt.videoElementEnd = seekableEnd;

		velt.videoHeight = velt.videoElement.videoHeight;
		velt.videoWidth = velt.videoElement.videoWidth;
		var stage = document.getElementById('stage');
		if (velt.videoWidth > mainText.offsetWidth) {
			var newHeight = mainText.offsetWidth / velt.videoWidth * velt.videoHeight;
			velt.videoElement.style.height = Math.floor(newHeight) + 'px';
			velt.videoElement.style.width = mainText.offsetWidth + 'px';
			stage.style.height = Math.floor(newHeight) + 'px';
			stage.style.width = mainText.offsetWidth + 'px';
		} else {
			velt.videoElement.style.height = velt.videoHeight + 'px';
			velt.videoElement.style.width = velt.videoWidth + 'px';
			stage.style.height = velt.videoHeight + 'px';
			stage.style.width = velt.videoWidth + 'px';
		}

		velt.videoElement.currentTime = velt.videoElementStart;

		// Animate
		if (!transformVideo.requestID)
			transformVideo();
	}, false);

	// Apply transformations
	velt.browserTransform = setBrowserTransform();
	velt.videoElement.playbackRate = velt.startRate;
	velt.videoElement.style[velt.browserTransform] = 'scale('+velt.startScale+')';
	velt.videoElement.style.top = velt.starty + 'px'; 
	velt.videoElement.style.left = velt.startx + 'px'; 
}

function videoMaker(thevideo) {
	// Add video tag to existing HTML of the main text div
  
	var videotag = '<div class="stage" id="stage" style="position:relative;overflow:hidden;"><video style="position:absolute;top:0;left:0;"> <source id="videoSource" src="'+thevideo+'"> Your browser does not support the video tag.  </video></div><div id="controls"></div>';
	var mainText = document.getElementById("text");
	mainText.innerHTML = videotag + mainText.innerHTML;
	
/* predefine zoom and rotate */
  var zoom = 1,
      rotate = 0;

/* Grab the necessary DOM elements */
  var stage = document.getElementById('stage'),
      v = document.getElementsByTagName('video')[0],
      controls = document.getElementById('controls');
	  videoSource = document.getElementById('videoSource');
  
	v.addEventListener( "loadedmetadata", function (e) {
		// Set size of stage and video
		if (v.videoWidth > mainText.offsetWidth) {
			var newHeight = mainText.offsetWidth / v.videoWidth * v.videoHeight;
			v.style.height = Math.floor(newHeight) + 'px';
			v.style.width = mainText.offsetWidth + 'px';
			stage.style.height = Math.floor(newHeight) + 'px';
			stage.style.width = mainText.offsetWidth + 'px';
		} else {
			v.style.height = v.videoHeight + 'px';
			v.style.width = v.videoWidth + 'px';
			stage.style.height = v.videoHeight + 'px';
			stage.style.width = v.videoWidth + 'px';
		}

		// Use velt object to hold start and end
		velt.videoElementStart = round(v.seekable.start(0), 100),
		velt.videoElementEnd = round(v.seekable.end(0), 100);
		document.getElementById('divTrueEnd').innerHTML = ' / '+round(velt.videoElementEnd, 100);

		// Update start and end textbox values
		var tbStart = document.getElementById('tbStart');
		var tbEnd = document.getElementById('tbEnd');
		tbStart.value = round(velt.videoElementStart, 100);
		tbEnd.value = round(velt.videoElementEnd, 100); 

		// Update seekStart and seekEnd in velt object
		velt.seekStart = velt.videoElementStart;
		velt.seekEnd = velt.videoElementEnd;

		// Update rangeTime.max (the slider) 
		rangeTime.max = (velt.seekEnd - velt.seekStart) * 24; // Approx 1 step = 1 frame

	}, false );

	v.addEventListener('timeupdate', function() {
		var tbCurrent =	document.getElementById('tbCurrent');
		tbCurrent.value = round(v.currentTime, 100);
		// var curPercent = (v.currentTime-velt.seekStart)/(velt.seekEnd-velt.seekStart)*100;   For when the slider was 0-100
		rangeTime.value = v.currentTime*24; // Assumes rangeTime.max set to video length (in seconds) * 24
	}, false);

/* Array of possible browser specific settings for transformation */
  var properties = ['transform', 'WebkitTransform', 'MozTransform',
                    'msTransform', 'OTransform'],
      prop = properties[0];

/* Iterators and stuff */    
  var i,j,t;
  
/* Find out which CSS transform the browser supports */
  for(i=0,j=properties.length;i<j;i++){
    if(typeof stage.style[properties[i]] !== 'undefined'){
      prop = properties[i];
      break;
    }
  }

/* Position video */
  v.style.left = 0;
  v.style.top = 0;

/* If there is a controls element, add the player buttons */
/* TODO: why does Opera not display the rotation buttons? */
  if(controls){
    controls.innerHTML =  '<button id="btnPlay" class="play">play</button>'+
		'<input type="range" id="rangeTime" defaultValue="0" value="0" style="width:500px;">' +
                          '<div id="change">' +
                            '<button class="zoomin">+</button>' +
                            '<button class="zoomout">-</button>' +
                            '<button class="left">left</button>' +
                            '<button class="right">right</button>' +
                            '<button class="up">up</button>' +
                            '<button class="down">down</button>' +
                            '<button class="slower">slower</button>' +
                            '<button class="faster">faster</button>' +
                            '<button class="reset">reset</button>' +
                          '</div>';
	controls.innerHTML += '<div id="startEnd">' +
		'Start: <input type="text" id="tbStart" size="3" maxlength="5">&nbsp;&nbsp;&nbsp;End: <input type="text" id="tbEnd" size="3" maxlength="5"><span id="divTrueEnd"></span>' +
		'&nbsp;&nbsp;Current: <input type="text" id="tbCurrent" size="3" maxlength="5">' +
		'<button class="frameback">Frame -</button>' +
		'<button class="frameforward">Frame +</button>' +
		'<br />' +
		'<button class="cur2start">Start here</button>' +
		'<button class="cur2end">End here</button>' +
		' o ' +
		'<button class="resetStart">Reset start</button>' +
		'<button class="resetEnd">Reset end</button>' +
		'<br />' +
		'Nudge Start: <button class="nudgeStartLeft">left</button>' +
		'<button class="nudgeStartRight">right</button>' +
		' Nudge End: <button class="nudgeEndLeft">left</button>' +
		'<button class="nudgeEndRight">right</button>' +
		'<br />' +
		'<button class="justBeforeEnd">&lt;------------------------ Jump to just before the end ------------------------&gt;</button>' +
		'' +
		'' +
                            '<textarea id="outputData" style="width:500px; height:70px"></textarea>' +
							'<br />' +
							'<button class="importStart">Import Start</button>' +
							'<button class="importEnd">Import End</button>' +
                          '</div>';
  }

  var rangeTime = document.getElementById('rangeTime');
  //rangeTime.addEventListener('input', alert('asdf: '+rangeTime.value), false); // Doesn't work. Why?

  var tbCurrent = document.getElementById('tbCurrent');
  //tbCurrent.addEventListener('change', alert('asdf: '+tbCurrent.value), false); // Doesn't work. Why?


/* If a button was clicked (uses event delegation)...*/
  controls.addEventListener('click',function(e){
    t = e.target;
    if(t.nodeName.toLowerCase()==='button'){

/* Check the class name of the button and act accordingly */    
      switch(t.className){

/* Toggle play functionality and button label */    
        case 'play':
          if(v.paused){
            v.play();
            t.innerHTML = 'pause';
          } else {
            v.pause();
            t.innerHTML = 'play';
          }
        break;

/* Increase zoom and set the transformation */
        case 'zoomin':
          zoom = fixFloat(zoom + 0.1, 10);
          v.style[prop]='scale('+zoom+') rotate('+rotate+'deg)';
        break;

/* Decrease zoom and set the transformation */
        case 'zoomout':
          zoom = fixFloat(zoom - 0.1, 10);
          v.style[prop]='scale('+zoom+') rotate('+rotate+'deg)';
        break;

/* Move video around by reading its left/top and altering it */
        case 'left':
          v.style.left = (parseInt(v.style.left,10) - 5) + 'px';
        break;
        case 'right':
          v.style.left = (parseInt(v.style.left,10) + 5) + 'px';
        break;
        case 'up':
          v.style.top = (parseInt(v.style.top,10) - 5) + 'px';
        break;
        case 'down':
          v.style.top = (parseInt(v.style.top,10) + 5) + 'px';
        break;

/* Faster / slower */
		case 'faster':
			v.playbackRate = fixFloat(v.playbackRate + .1, 10);
		break;

		case 'slower':
			v.playbackRate = fixFloat(v.playbackRate - .1, 10);
		break;

/* Reset all to default */
        case 'reset':
          zoom = 1;
          rotate = 0;
          v.style.top = 0 + 'px';
          v.style.left = 0 + 'px';
          v.style[prop]='rotate('+rotate+'deg) scale('+zoom+')';
        break;
      } 

  var outputData = document.getElementById('outputData');
  outputData.value = 'Start: '+velt.videoElementStart+', End: '+velt.videoElementEnd+', Speed: '+v.playbackRate+', Zoom: '+zoom+', x: '+parseInt(v.style.left, 10)+', y: '+parseInt(v.style.top, 10)+'\r\n'+
'For showVideo function if start: '+velt.videoElementStart+', '+velt.videoElementEnd+', '+v.playbackRate+', '+zoom+', '+parseInt(v.style.left, 10)+', '+parseInt(v.style.top, 10)+"\r\n"+
'For showVideo function if end: '+v.playbackRate+', '+zoom+', '+parseInt(v.style.left, 10)+', '+parseInt(v.style.top, 10)+'\r\n';

      e.preventDefault();
    }
  },false);

/* If a button was clicked (uses event delegation)...*/
  startEnd.addEventListener('click',function(e){
    t = e.target;
    if(t.nodeName.toLowerCase()==='button'){

/* Check the class name of the button and act accordingly */    
      switch(t.className){

/* Toggle play functionality and button label */    
        case 'frameforward':
			if(!(v.paused)) v.pause();
            document.getElementById('btnPlay').innerHTML = 'play';
			v.currentTime = v.currentTime + 1/24;
			rangeTime.value = round(v.currentTime, 100); // Why does handle jump to beginning?
		break;

        case 'frameback':
			if(!(v.paused)) v.pause();
            document.getElementById('btnPlay').innerHTML = 'play';
			v.currentTime = v.currentTime - 1/24;
			rangeTime.value = round(v.currentTime, 100); // Why does handle jump to beginning?
		break;

        case 'cur2end':
			velt.videoElementEnd = round(v.currentTime, 100);
			tbEnd.value = velt.videoElementEnd;
			if(velt.videoElementEnd < velt.videoElementStart) {
				velt.videoElementStart = velt.seekStart;
				tbStart.value = velt.seekStart;
			}
		break;

        case 'cur2start':
			velt.videoElementStart = round(v.currentTime, 100);
			tbStart.value = velt.videoElementStart;
			if(velt.videoElementEnd < velt.videoElementStart) {
				velt.videoElementEnd = velt.seekEnd;
				tbEnd.value = velt.seekEnd;
			}
		break;

		case 'resetStart':
			velt.videoElementStart = velt.seekStart;
			tbStart.value = velt.seekStart;
		break;

		case 'resetEnd':
			velt.videoElementEnd = velt.seekEnd;
			tbEnd.value = velt.seekEnd;
		break;

		case 'nudgeStartLeft':
			if(velt.videoElementStart - 1/24 >= velt.seekStart) {
				velt.videoElementStart = round(velt.videoElementStart - 1/24, 100);
				tbStart.value = velt.videoElementStart;
				v.currentTime = velt.videoElementStart;
			} else {
				velt.videoElementStart = velt.seekStart;
				tbStart.value = velt.videoElementStart;
				v.currentTime = velt.videoElementStart;
			}
		break;

		case 'nudgeStartRight':
			if(velt.videoElementStart + 1/24 <= velt.seekEnd && velt.videoElementStart + 1/24 <= velt.videoElementEnd) {
				velt.videoElementStart = round(velt.videoElementStart + 1/24, 100);
				tbStart.value = velt.videoElementStart;
				v.currentTime = velt.videoElementStart;
			}
		break;

		case 'nudgeEndLeft':
			if(velt.videoElementEnd - 1/24 >= velt.seekStart && velt.videoElementEnd - 1/24 >= velt.videoElementStart) {
				velt.videoElementEnd = round(velt.videoElementEnd - 1/24, 100);
				tbEnd.value = velt.videoElementEnd;
				v.currentTime = velt.videoElementEnd - 1/6;
			}
		break;

		case 'nudgeEndRight':
			if(velt.videoElementEnd + 1/24 <= velt.seekEnd) {
				velt.videoElementEnd = round(velt.videoElementEnd + 1/24, 100);
				tbEnd.value = velt.videoElementEnd;
				v.currentTime = velt.videoElementEnd - 1/5;
			} else {
				velt.videoElementEnd = velt.seekEnd;
				tbEnd.value = velt.videoElementEnd;
				v.currentTime = velt.videoElementEnd - 1/5;
			}
		break;

		case 'justBeforeEnd':
			justBeforeEnd(.6);
		break;

		case 'importStart':
		// Should do way more error checking here.
			var outputData = document.getElementById('outputData');
			var args = /\(\s*([^)]+?)\s*\)/.exec(outputData.value);
			if (args[1]) {
				args = args[1].split(/\s*,\s*/);
				velt.videoElementStart = Number(args[1]);
				velt.videoElementEnd = Number(args[2]);
				v.playbackRate = Number(args[3]);
				zoom = Number(args[4]);
				v.style[prop]='scale('+zoom+')';
				v.style.left = Number(args[5]) + 'px';
				v.style.top = Number(args[6]) + 'px';
				tbStart.value = velt.videoElementStart;
				tbEnd.value = velt.videoElementEnd;
			}
		break;

		case 'importEnd':
		// Should do way more error checking here.
			var outputData = document.getElementById('outputData');
			var args = /\(\s*([^)]+?)\s*\)/.exec(outputData.value);
			if (args[1]) {
				args = args[1].split(/\s*,\s*/);
			}
			if (args[7]) {
				velt.videoElementStart = Number(args[1]);
				velt.videoElementEnd = Number(args[2]);
				v.playbackRate = Number(args[7]);
				zoom = Number(args[8]);
				v.style[prop]='scale('+zoom+')';
				v.style.left = Number(args[9]) + 'px';
				v.style.top = Number(args[10]) + 'px';

				tbStart.value = velt.videoElementStart;
				tbEnd.value = velt.videoElementEnd;
			}
		break;
	  }
      e.preventDefault();
    }
  },false);

// Kanon added: set v.style.width. Seems undefined, but I seem to need it.
/*v.addEventListener( "loadedmetadata", function (e) {
	if (!(v.style.width>0)) {
		v.style.width = v.videoWidth+'px';
	}
}, false ); Do diff way elsewhere */

// Kanon added: mousewheel zoom
/*if (v.addEventListener) {
	// IE9, Chrome, Safari, Opera
	v.addEventListener("mousewheel", MouseWheelHandler, false);
	// Firefox
	v.addEventListener("DOMMouseScroll", MouseWheelHandler, false);
}
// IE 6/7/8
else v.attachEvent("onmousewheel", MouseWheelHandler);

function MouseWheelHandler(e) {
	// Don't use v.style.width anymore. Use zoom.
	// cross-browser wheel delta
	var e = window.event || e; // old IE support
	var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
	v.style.width = Math.max(50, Math.min(800, parseInt(v.style.width,10) + (30 * delta))) + "px";

	return false;
}
*/

	// Why was this all the way at the bottom after all the below functions? Moved it here, and things seem to work. Could not find old, working version to compare with.

// Call the function with requestAnimationFrame to play only the specified range.
playEditorRange();
}

var playEditorRange = function() {
	if(round(v.currentTime, 100) >= velt.videoElementEnd) {
		v.currentTime = velt.videoElementStart;
		v.play();
	} else if(v.currentTime < velt.videoElementStart) { 
		v.currentTime = velt.videoElementStart;
	}

	requestAnimationFrame(playEditorRange);
}

function justBeforeEnd(howMuch = .5) {
	var adjuster = velt.videoElementEnd - howMuch;
	if (adjuster >= velt.seekStart) {
		if(adjuster >= velt.videoElementStart) 
			v.currentTime = adjuster;
		else
			v.currentTime = velt.videoElementStart;
	}
}

function round(value, decimals) {
  //return Number(Math.round(value+'e'+decimals)+'e-'+decimals); Doesn't seem to work if value has more than 3 decimals
	//alert(Math.round(value.toExponential() * decimals)+' '+decimals+' '+Math.sqrt(decimals));
  return Number(Math.round(value.toExponential() * decimals)+'e-'+(Math.log10(decimals)));
}

function fixFloat(value, decimals) {
  return Math.round((value+0.00001)*decimals)/decimals;
}

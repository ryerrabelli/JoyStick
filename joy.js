/*
 * Name          : joy.js
 * @author       : Roberto D'Amico (Bobboteck)
 * @author       : Rahul S. Yerrabelli (ryerrabelli)
 * Last modified : 08.31.2022
 * Revision      : 2.1.x
 *
 * Modification History:
 * Date         Version     Modified By     Description
 * 2022-08-31   2.1.x       Rahul S. Yerrabelli
 * 2021-12-21   2.0.0       Roberto D'Amico New version of the project that integrates the callback functions, while
 *                                          maintaining compatibility with previous versions. Fixed Issue #27 too, 
 *                                          thanks to @artisticfox8 for the suggestion.
 * 2020-06-09   1.1.6       Roberto D'Amico Fixed Issue #10 and #11
 * 2020-04-20   1.1.5       Roberto D'Amico Correct: Two sticks in a row, thanks to @liamw9534 for the suggestion
 * 2020-04-03               Roberto D'Amico Correct: InternalRadius when change the size of canvas, thanks to 
 *                                          @vanslipon for the suggestion
 * 2020-01-07   1.1.4       Roberto D'Amico Close #6 by implementing a new parameter to set the functionality of 
 *                                          auto-return to 0 position
 * 2019-11-18   1.1.3       Roberto D'Amico Close #5 correct indication of East direction
 * 2019-11-12   1.1.2       Roberto D'Amico Removed Fix #4 incorrectly introduced and restored operation with touch 
 *                                          devices
 * 2019-11-12   1.1.1       Roberto D'Amico Fixed Issue #4 - Now JoyStick work in any position in the page, not only 
 *                                          at 0,0
 * 
 * The MIT License (MIT)
 *
 *  This file is part of the JoyStick Project (https://github.com/bobboteck/JoyStick).
 *	Copyright (c) 2015 Roberto D'Amico (Bobboteck).
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

let StickStatus = {
  xPositionLev0: 0,
  yPositionLev0: 0,
  xLev0: 0,
  yLev0: 0,
  xNormLev0: 0,
  yNormLev0: 0,
  cardinalDirection: "C",
};

/**
 * @desc Principal object that draw a joystick, you only need to initialize the object and suggest the HTML container
 * @costructor
 * @param container {String} - HTML object that contains the Joystick
 * @param parameters (optional) - object with following keys:
 *  title {String} (optional) - The ID of canvas (Default value is 'joystick')
 *  width {Int} (optional) - The width of canvas, if not specified is setted at width of container object (Default value is the width of container object)
 *  height {Int} (optional) - The height of canvas, if not specified is setted at height of container object (Default value is the height of container object)
 *  internalFillColor {String} (optional) - Internal color of Stick (Default value is '#00AA00')
 *  internalLineWidth {Int} (optional) - Border width of Stick (Default value is 2)
 *  internalStrokeColor {String}(optional) - Border color of Stick (Default value is '#003300')
 *  externalLineWidth {Int} (optional) - External reference circonference width (Default value is 2)
 *  externalStrokeColor {String} (optional) - External reference circonference color (Default value is '#008000')
 *  autoReturnToCenter {Bool} (optional) - Sets the behavior of the stick, whether or not, it should return to zero position when released (Default value is True and return to zero)
 * @param callback {StickStatus} -
 */
const JoyStick = function (container, parameters, callback) {
  const givenParameters = Object.assign({}, parameters);   // clone dict
  parameters = parameters || {};
  const title = (typeof parameters.title === "undefined" ? "joystick" : parameters.title);
  let width = (typeof parameters.width === "undefined" ? 0 : parameters.width),
    height = (typeof parameters.height === "undefined" ? 0 : parameters.height);

  // Get object that will contain the canvas once we create it
  const objContainer = document.getElementById(container);
  // Fixing Unable to preventDefault inside passive event listener due to target being treated as passive in Chrome [Thanks to https://github.com/artisticfox8 for this suggestion]
  objContainer.style.touchAction = "none";
  if (width === 0) { width = objContainer.clientWidth; }
  if (height === 0) { height = objContainer.clientHeight; }

  const internalFillColor = (typeof parameters.internalFillColor === "undefined" ? "#00AA00" : parameters.internalFillColor),
    internalLineWidth = (typeof parameters.internalLineWidth === "undefined" ? 2 : parameters.internalLineWidth),
    internalStrokeColor = (typeof parameters.internalStrokeColor === "undefined" ? "#003300" : parameters.internalStrokeColor),
    externalLineWidth = (typeof parameters.externalLineWidth === "undefined" ? 2 : parameters.externalLineWidth),
    externalStrokeColor = (typeof parameters.externalStrokeColor === "undefined" ? "#008000" : parameters.externalStrokeColor),
    autoReturnToCenter = (typeof parameters.autoReturnToCenter === "undefined" ? true : parameters.autoReturnToCenter);
  // Normalized values are from 0 to 1 (inclusive) with 0 being the bottommost or leftmost part of the screen
  const startNormLocX = (typeof parameters.startNormLocX === "undefined" ? 0.5 : parameters.startNormLocX),
    startNormLocY = (typeof parameters.startNormLocY === "undefined" ? 0.5 : parameters.startNormLocY);
  const radiiDifference = (typeof parameters.radiiDifference === "undefined" ? 30 : parameters.radiiDifference);
  const internalRadius = (typeof parameters.internalRadius === "undefined" ? (width - (width/2 + 10) - radiiDifference) / 2 : parameters.internalRadius);
  const joystickLevels = (typeof parameters.joystickLevels === "undefined" ? 1 : parameters.joystickLevels);
  const internalRadiusLev1 = (typeof parameters.internalRadiusLev1 === "undefined" ? internalRadius/5 : parameters.internalRadiusLev1);
  const externalRadius = (typeof parameters.externalRadius === "undefined" ? internalRadius + radiiDifference : parameters.externalRadius);
  const maxMoveStickBeyondInternalRadius = (typeof parameters.maxMoveStickBeyondInternalRadius === "undefined" ? 5 : parameters.maxMoveStickBeyondInternalRadius);
  // maxMoveStick is how far from the center the joystick can move
  const maxMoveStickLev0 = (typeof parameters.maxMoveStick === "undefined" ? internalRadius + maxMoveStickBeyondInternalRadius : parameters.maxMoveStick);
  const moveRelativeToInitialMouseDown = (typeof parameters.moveRelativeToInitialMouseDown === "undefined" ? false : parameters.moveRelativeToInitialMouseDown);

  const maxMoveStickLev1 = (typeof parameters.maxMoveStickLev1 === "undefined" ?
    internalRadius-2*internalRadiusLev1 :  // default has subtraction multiplied by 2 because one on each side
    parameters.maxMoveStickLev1);
  const startNormLocXLev1 = (typeof parameters.startNormLocXLev1 === "undefined" ? 0.5 : parameters.startNormLocXLev1),
    startNormLocYLev1 = (typeof parameters.startNormLocYLev1 === "undefined" ? 0.0 : parameters.startNormLocYLev1);

  callback = callback || ( function (StickStatus) { } );

  // Create Canvas element and add it in the Container object
  const canvas = document.createElement("canvas");
  canvas.id = title;
  canvas.width = width;
  canvas.height = height;
  objContainer.appendChild(canvas);
  const context = canvas.getContext("2d");

  let pressed = -1; //  -1 means not pressed, 0 means level 0 pressed, 1 means level 1/2 pressed
  let pressedXLev0 = null;
  let pressedYLev0 = null;
  let pressedXLev1 = null;
  let pressedYLev1 = null;

  const twopi = 2 * Math.PI;  // circumference of unit circle aka 360 degrees in radians
  const directionHorizontalLimitPos = canvas.width / 10;
  const directionHorizontalLimitNeg = directionHorizontalLimitPos * -1;
  const directionVerticalLimitPos = canvas.height / 10;
  const directionVerticalLimitNeg = directionVerticalLimitPos * -1;

  const centerRawLocXLev0 = canvas.width / 2;
  const centerRawLocYLev0 = canvas.height / 2;
  const centerRawLocXLev1 = maxMoveStickLev1;
  const centerRawLocYLev1 = maxMoveStickLev1;
  const startRawLocXLev0 = canvas.width * startNormLocX;
  const startRawLocYLev0 = canvas.height * (1-startNormLocY);
  const startRawLocXLev1 = maxMoveStickLev1*2 * startNormLocXLev1;
  const startRawLocYLev1 = maxMoveStickLev1*2 * (1-startNormLocYLev1);
  const setupParameters = {
    title: title,
    width: width,
    height: height,
    internalFillColor: internalFillColor,
    internalLineWidth: internalLineWidth,
    internalStrokeColor: internalStrokeColor,
    externalLineWidth: externalLineWidth,
    externalStrokeColor: externalStrokeColor,
    autoReturnToCenter: autoReturnToCenter,
    startNormLocX: startNormLocX,
    startNormLocY: startNormLocY,
    startNormLocXLev1: startNormLocXLev1,
    startNormLocYLev1: startNormLocYLev1,
    radiiDifference: radiiDifference,
    internalRadius: internalRadius,
    internalRadiusLev1: internalRadiusLev1,
    externalRadius: externalRadius,
    maxMoveStickBeyondInternalRadius: maxMoveStickBeyondInternalRadius,
    maxMoveStickLev0: maxMoveStickLev0,
    maxMoveStickLev1: maxMoveStickLev1,
    moveRelativeToInitialMouseDown: moveRelativeToInitialMouseDown,
    centerRawLocXLev0: centerRawLocXLev0,
    centerRawLocYLev0: centerRawLocYLev0,
    centerRawLocXLev1: centerRawLocXLev1,
    centerRawLocYLev1: centerRawLocYLev1,
    directionHorizontalLimitPos: directionHorizontalLimitPos,
    directionHorizontalLimitNeg: directionHorizontalLimitNeg,
    directionVerticalLimitPos: directionVerticalLimitPos,
    directionVerticalLimitNeg: directionVerticalLimitNeg,
    startRawLocXLev0: startRawLocXLev0,
    startRawLocYLev0: startRawLocYLev0,
    startRawLocXLev1: startRawLocXLev1,
    startRawLocYLev1: startRawLocYLev1,
  }
  // Used to save current position of stick
  let currentRawLocXLev0 = startRawLocXLev0;
  let currentRawLocYLev0 = startRawLocYLev0;
  let currentRawLocXLev1 = startRawLocXLev1;
  let currentRawLocYLev1 = startRawLocYLev1;

  // Check if the device support the touch or not
  if ("ontouchstart" in document.documentElement) {
    canvas.addEventListener("touchstart", onTouchStart, false);
    document.addEventListener("touchmove", onTouchMove, false);
    document.addEventListener("touchend", onTouchEnd, false);
  } else {
    canvas.addEventListener("mousedown", onMouseDown, false);
    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mouseup", onMouseUp, false);
  }
  // Draw the object
  drawExternal();
  drawInternal();

  /******************************************************
   * Private methods
   *****************************************************/

  /**
   * @desc Draw the external circle used as reference position
   */
  function drawExternal() {
    context.beginPath();
    context.arc(centerRawLocXLev0, centerRawLocYLev0, externalRadius, 0, twopi, false);
    context.lineWidth = externalLineWidth;
    context.strokeStyle = externalStrokeColor;
    context.stroke();
  }

  /**
   * @desc Draw the internal stick in the current position the user have moved it
   */
  function drawInternal() {
    context.beginPath();
    // prevent circle from being outside the canvas
    if (currentRawLocXLev0 < internalRadius) {
      //console.log("X1: ", currentRawLocXLev0.toFixed(2) + " < " + internalRadius.toFixed(2) + " -->" + maxMoveStickLev0.toFixed(1));
      currentRawLocXLev0 = internalRadius;
    }
    if (currentRawLocXLev0 + internalRadius > canvas.width) {
      //console.log("X2: ", currentRawLocXLev0.toFixed(2) + " > " + (canvas.width-internalRadius).toFixed(2) + " -->" + (canvas.width-maxMoveStickLev0).toFixed(1));
      currentRawLocXLev0 = canvas.width - internalRadius;
    }
    if (currentRawLocYLev0 < internalRadius) {
      //console.log("Y1: ", currentRawLocYLev0.toFixed(2) + " < " + internalRadius.toFixed(2) + " -->" + maxMoveStickLev0.toFixed(1));
      currentRawLocYLev0 = internalRadius;
    }
    if (currentRawLocYLev0 + internalRadius > canvas.height) {
      //console.log("Y2: ", currentRawLocYLev0.toFixed(2) + " > " + (canvas.height-internalRadius).toFixed(2) + " -->" + (canvas.height-maxMoveStickLev0).toFixed(1));
      currentRawLocYLev0 = canvas.height - internalRadius;
    }

    // prevent the circle from being beyond maxMoveStickLev0
    if ( (currentRawLocXLev0-centerRawLocXLev0) > maxMoveStickLev0) currentRawLocXLev0 = centerRawLocXLev0 + maxMoveStickLev0;
    if ( (centerRawLocXLev0-currentRawLocXLev0) > maxMoveStickLev0) currentRawLocXLev0 = centerRawLocXLev0 - maxMoveStickLev0;
    if ( (currentRawLocYLev0-centerRawLocYLev0) > maxMoveStickLev0) currentRawLocYLev0 = centerRawLocYLev0 + maxMoveStickLev0;
    if ( (centerRawLocYLev0-currentRawLocYLev0) > maxMoveStickLev0) currentRawLocYLev0 = centerRawLocYLev0 - maxMoveStickLev0;

    if (joystickLevels===2) {
      // prevent the level 2 circle from being beyond maxMoveStickLev1
      if ( currentRawLocXLev1-centerRawLocXLev1 > maxMoveStickLev1) currentRawLocXLev1 = centerRawLocXLev1 + maxMoveStickLev1;
      if ( centerRawLocXLev1-currentRawLocXLev1 > maxMoveStickLev1) currentRawLocXLev1 = centerRawLocXLev1 - maxMoveStickLev1;
      if ( currentRawLocYLev1-centerRawLocYLev1 > maxMoveStickLev1) currentRawLocYLev1 = centerRawLocYLev1 + maxMoveStickLev1;
      if ( centerRawLocYLev1-currentRawLocYLev1 > maxMoveStickLev1) currentRawLocYLev1 = centerRawLocYLev1 - maxMoveStickLev1;
    }

    // create radial gradient for fill color
    const grd = context.createRadialGradient(centerRawLocXLev0, centerRawLocYLev0, 5, centerRawLocXLev0, centerRawLocYLev0, 200);
    // Light color
    grd.addColorStop(0, internalFillColor);
    // Dark color
    grd.addColorStop(1, internalStrokeColor);
    context.fillStyle = grd;
    context.lineWidth = internalLineWidth;
    context.strokeStyle = internalStrokeColor;

    context.arc(currentRawLocXLev0, currentRawLocYLev0, internalRadius, 0, twopi, false);
    context.fill();
    context.stroke();

    if (joystickLevels===2) {
      context.beginPath();
      context.arc(
        currentRawLocXLev0 + currentRawLocXLev1-centerRawLocXLev1,
        currentRawLocYLev0 + currentRawLocYLev1-centerRawLocYLev1,
        internalRadiusLev1, 0, twopi, false);
      context.fill();
      context.stroke();
    }

  }

  function redraw() {
    // Delete canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    // Redraw object
    drawExternal();
    drawInternal();
  }

  function updateStickStatus(currentRawLocXLev0, currentRawLocYLev0, currentRawLocXLev1=null, currentRawLocYLev1=null) {
    StickStatus.xPositionLev0 = currentRawLocXLev0;
    StickStatus.yPositionLev0 = currentRawLocYLev0;
    StickStatus.xLev0 =   (100 * (currentRawLocXLev0 - centerRawLocXLev0) / maxMoveStickLev0).toFixed();
    StickStatus.yLev0 =   (100 * (currentRawLocYLev0 - centerRawLocYLev0) / maxMoveStickLev0  * -1).toFixed();
    StickStatus.xNormLev0 = (1 + (currentRawLocXLev0 - centerRawLocXLev0) / maxMoveStickLev0)/2.0;
    StickStatus.yNormLev0 = (1 + (currentRawLocYLev0 - centerRawLocYLev0) / maxMoveStickLev0  * -1)/2.0;

    if (!isNullOrUndef(currentRawLocXLev1) && !isNullOrUndef(currentRawLocYLev1)) {
      StickStatus.xPositionLev1 = currentRawLocXLev1;
      StickStatus.yPositionLev1 = currentRawLocYLev1;
      StickStatus.xLev1 =   (100 * (currentRawLocXLev1 - centerRawLocXLev1) / maxMoveStickLev1).toFixed();
      StickStatus.yLev1 =   (100 * (currentRawLocYLev1 - centerRawLocYLev1) / maxMoveStickLev1  * -1).toFixed();
      StickStatus.xNormLev1 = (1 + (currentRawLocXLev1 - centerRawLocXLev1) / maxMoveStickLev1)/2.0;
      StickStatus.yNormLev1 = (1 + (currentRawLocYLev1 - centerRawLocYLev1) / maxMoveStickLev1  * -1)/2.0;

      //StickStatus.xNormLevCombined = this.GetNormLocLevCombined();
      //StickStatus.yNormLevCombined = this.GetNormLocLevCombined();
    }

    StickStatus.cardinalDirection = getCardinalDirection();
  }
  /**
   * @desc Events for manage mouse and touch
   */
  function onTouchStart(event) {
    onMouseDown(event, 0);  // make button 0 to assume left click
  }
  function onTouchMove(event) {
    if (event.targetTouches[0].target === canvas) {
      onMouseMove(event);
    }
  }
  function onTouchEnd(event) {
    onMouseUp(event);
  }
  function onMouseDown(event, button=null) {
    if (isNullOrUndef(button)) button = event.button;
    if (button===0) {  // 0 is left click, 1 is middle, 2 is right click
      const locs = getCorrectedPositionOnCanvas(event.pageX, event.pageY);
      const loc = locs[0];
      pressedXLev0 = loc.x - currentRawLocXLev0;  // pressed position relative to the circle
      pressedYLev0 = loc.y - currentRawLocYLev0;
      if (joystickLevels===2) {
        const locLev1 = locs[1];
        pressedXLev1 = locLev1.x- currentRawLocXLev1;  // pressed position relative to the circle
        pressedYLev1 = locLev1.y - currentRawLocYLev1;
      }

      if (Math.abs(pressedXLev1) <= internalRadiusLev1  && Math.abs(pressedYLev1) <= internalRadiusLev1) {
        // clicked level 2 joystick
        pressed = 1;
        pressedXLev0 = null;
        pressedYLev0 = null;
      } else if (!moveRelativeToInitialMouseDown || (Math.abs(pressedXLev0) <= internalRadius && Math.abs(pressedYLev0) <= internalRadius) ) {
        // clicked level 1 joystick (or area around it if moveRelativeToInitialMouseDown is false)
        pressed = 0;
        pressedXLev1 = null;
        pressedYLev1 = null;
      } else {
        pressed = -1;
        pressedXLev0 = null;
        pressedYLev0 = null;
        pressedXLev1 = null;
        pressedYLev1 = null;
      }
    }

  }
  /* To simplify this code there was a new experimental feature here: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/offsetX , but it present only in Mouse case not metod presents in Touch case :-( */
  function onMouseMove(event) {
    if (pressed >= 0) {
      const locs = getCorrectedPositionOnCanvas(event.pageX, event.pageY);
      if (pressed===0) {
        const loc = locs[0];
        if (moveRelativeToInitialMouseDown) {
          currentRawLocXLev0 = loc.x - pressedXLev0;
          currentRawLocYLev0 = loc.y - pressedYLev0;
        } else {
          currentRawLocXLev0 = loc.x;
          currentRawLocYLev0 = loc.y;
        }
      } else if (joystickLevels===2 && pressed===1) {
        const locLev1 = locs[1];
        currentRawLocXLev1 = locLev1.x - pressedXLev1;
        currentRawLocYLev1 = locLev1.y - pressedYLev1;
      }

      redraw();

      // Set attribute of callback
      updateStickStatus(currentRawLocXLev0, currentRawLocYLev0, currentRawLocXLev1, currentRawLocYLev1);
      callback(StickStatus);
    }
  }
  function onMouseUp(event) {
    pressed = -1;  // -1 is not pressed
    pressedXLev0 = null;
    pressedYLev0 = null;
    pressedXLev1 = null;
    pressedYLev1 = null;
    // If required reset position store variable
    if (autoReturnToCenter) {
      currentRawLocXLev0 = startRawLocXLev0;
      currentRawLocYLev0 = startRawLocYLev0;
    }
    redraw();

    // Set attribute of callback
    updateStickStatus(currentRawLocXLev0, currentRawLocYLev0, currentRawLocXLev1, currentRawLocYLev1);
    callback(StickStatus);
  }
  function getCorrectedPositionOnCanvas(uncorrectedX, uncorrectedY) {
    // uncorrected coordinates are relative to the entire webpage
    // corrected is relative to the canvas
    let correctedX, correctedY;
    // Manage offset
    if (canvas.offsetParent.tagName.toUpperCase() === "BODY") {
      correctedX = uncorrectedX - canvas.offsetLeft;
      correctedY = uncorrectedY - canvas.offsetTop;
    } else {
      correctedX = uncorrectedX - canvas.offsetParent.offsetLeft;
      correctedX = uncorrectedY - canvas.offsetParent.offsetTop;
    }
    let correctedPositions =  [ {
      x: correctedX,
      y: correctedY,
    } ];
    if (joystickLevels===2) {
      correctedPositions.push({
        x: correctedX - currentRawLocXLev0 + centerRawLocXLev1,
        y: correctedY - currentRawLocYLev0 + centerRawLocYLev1,
      });
    }
    return correctedPositions;
  }

  /**
   *
   * @returns {string}
   */
  function getCardinalDirection() {
    let result = "";
    let horizontal = currentRawLocXLev0 - centerRawLocXLev0;
    let vertical = currentRawLocYLev0 - centerRawLocYLev0;

    if (vertical >= directionVerticalLimitNeg && vertical <= directionVerticalLimitPos) {
      result = "C";
    }
    if (vertical < directionVerticalLimitNeg) {
      result = "N";
    }
    if (vertical > directionVerticalLimitPos) {
      result = "S";
    }

    if (horizontal < directionHorizontalLimitNeg) {
      if (result === "C") {
        result = "W";
      } else {
        result += "W";
      }
    }
    if (horizontal > directionHorizontalLimitPos) {
      if (result === "C") {
        result = "E";
      } else {
        result += "E";
      }
    }

    return result;
  }

  /******************************************************
   * Public methods
   *****************************************************/

  /**
   * @desc Get the parameters given when initializing this object
   * @return dict
   */
  this.GetGivenParameters = function() {
    return givenParameters;
  };
  /**
   * @desc Get the parameters that were calculated initially during setting up the object
   * @return {autoReturnToCenter: boolean|boolean|*, centerRawLocYLev0: number, centerRawLocXLev0: number, maxMoveStickLev0: *, title: string|string|*, startNormLocX: number|number|*, startNormLocY: number|number|*, directionHorizontalLimitPos: number, internalFillColor: string|*, externalRadius: *, directionHorizontalLimitNeg: number, height: number|*, moveRelativeToInitialMouseDown: boolean|boolean|*, internalRadius: number|number|*, internalLineWidth: number|*, externalLineWidth: number|*, width: number|*, externalStrokeColor: string|*, startRawLocYLev0: number, directionVerticalLimitNeg: number, startRawLocXLev0: number, maxMoveStickBeyondInternalRadius: number|number|*, internalStrokeColor: string|*, radiiDifference: number|number|*, directionVerticalLimitPos: number}
   */
  this.GetSetupParameters = function() {
    return setupParameters;
  };
  /**
   * @desc Get the parameters that were calculated initially during setting up the object
   * @return dict
   */
  this.GetWorkingParameters = function() {
    return {
      currentRawLocXLev0: currentRawLocXLev0,
      currentRawLocYLev0: currentRawLocYLev0,
      currentRawLocXLev1: currentRawLocXLev1,
      currentRawLocYLev1: currentRawLocYLev1,
      pressed: pressed,
      pressedXLev0: pressedXLev0,
      pressedYLev0: pressedYLev0,
      pressedXLev1: pressedXLev1,
      pressedYLev1: pressedYLev1,
      width: width,
      height: height,
    };
  };

  /**
   * @desc The width of canvas
   * @return Number of pixel width
   */
  this.GetWidth = function () {
    return canvas.width;
  };

  /**
   * @desc The height of canvas
   * @return Number of pixel height
   */
  this.GetHeight = function () {
    return canvas.height;
  };

  /**
   * @desc The X position of the cursor relative to the canvas that contains it and to its dimensions
   * @param {number?} level
   * @return Number that indicate relative position
   */
  this.GetRawLocX = function ({level=null}={}) {
    if (isNullOrUndef(level) || level===0) return currentRawLocXLev0;
    else if (level>=1) return currentRawLocXLev1;

  };

  /**
   * @desc The Y position of the cursor relative to the canvas that contains it and to its dimensions
   * @param {number?} level
   * @return Number that indicates relative position
   */
  this.GetRawLocY = function ({level=null}={}) {
    if (isNullOrUndef(level) || level===0) return currentRawLocYLev0;
    else if (level>=1) return currentRawLocYLev1;
  };
  /**
   * @desc The X and Y positions of the cursor relative to the canvas that contains it and to its dimensions
   * @param {number?} level
   * @return Array of numbers that indicate relative position
   */
  this.GetRawLoc = function({level=null}={}) {
    if (isNullOrUndef(level) || level===0) return [currentRawLocXLev0, currentRawLocYLev0];
    else if (level>=1) return [currentRawLocXLev1, currentRawLocYLev1];
  }
  this.SetRawLoc = function (rawLocX, rawLocY, {doRedraw=true, level=null}={}) {
    if (isNullOrUndef(level) || level===0) {
      if (!isNullOrUndef(rawLocX)) currentRawLocXLev0 = rawLocX;
      if (!isNullOrUndef(rawLocY)) currentRawLocYLev0 = rawLocY;
      if (doRedraw) redraw();
      return [currentRawLocXLev0, currentRawLocYLev0];
    } else if (level>=1) {
      if (!isNullOrUndef(rawLocX)) currentRawLocXLev1 = rawLocX;
      if (!isNullOrUndef(rawLocY)) currentRawLocYLev1 = rawLocY;
      if (doRedraw) redraw();
      return [currentRawLocXLev1, currentRawLocYLev1];
    }


  };

  this.GetRawLocLev1 = function() {
    return this.GetRawLoc({level:1});
  }
  this.SetRawLocLev1 = function (rawLocXLev1, rawLocYLev1, doRedraw=true) {
    return this.SetRawLoc(rawLocXLev1,rawLocYLev1,{doRedraw: doRedraw, level:1});
  };

  /**
   * @desc Normalized value of X move of stick
   * @param {number?} level
   * @return Float from 0 to 1
   */
  this.GetNormLocX = function ({level=null}={}) {
    if (isNullOrUndef(level) || level===-1) return this.GetNormLocXLevCombined();
    if (level===0) return (1 + (currentRawLocXLev0 - centerRawLocXLev0) / maxMoveStickLev0)/2.0;
    else if (level>=1) return (1 + (currentRawLocXLev1 - centerRawLocXLev1) / maxMoveStickLev1)/2.0;
  };
  /**
   * @desc Normalized value of Y move of stick
   * @param {number?} level
   * @return Float from 0 to 1
   */
  this.GetNormLocY = function ({level=null}={}) {
    if (isNullOrUndef(level) || level===-1) return this.GetNormLocYLevCombined();
    if (level===0) return (1 + (currentRawLocYLev0 - centerRawLocYLev0) / maxMoveStickLev0  * -1)/2.0;
    else if (level>=1) return (1 + (currentRawLocYLev1 - centerRawLocYLev1) / maxMoveStickLev1  * -1)/2.0;
  };

  /**
   * @desc Normalized value of X and Y move of stick
   * @param {number?} level
   * @return Array of floats from 0 to 1
   */
  this.GetNormLoc = function ({level=null}={}) {
    if (isNullOrUndef(level) || level===-1) return this.GetNormLocLevCombined();
    if (level===0) return [this.GetNormLocX(), this.GetNormLocY()];
    else if (level>=1) return [this.GetNormLocXLev1(), this.GetNormLocYLev1()];
  };
  this.GetNormLocXLev1 = function () {
    return this.GetNormLocX({level:1});
  };
  this.GetNormLocYLev1 = function () {
    return this.GetNormLocY({level:1});
  };
  this.GetNormLocLev1 = function () {
    return this.GetNormLoc({level:1});
  };

  this.GetCombinedLevValue = function(normLev0, normLev1) {
    const relativeJoystickPower = 0.2;
    // create weighted sum value, then divide by max possible value
    return (normLev0 + normLev1*relativeJoystickPower) / (1+relativeJoystickPower);
  }
  this.GetNormLocXLevCombined = function() {
    const normLocXLevCombined = this.GetCombinedLevValue(
      this.GetNormLocX({level:0}),
      this.GetNormLocX({level:1})
    );
    return normLocXLevCombined;
  }
  this.GetNormLocYLevCombined = function() {
    const normLocYLevCombined = this.GetCombinedLevValue(
      this.GetNormLocY({level:0}),
      this.GetNormLocY({level:1})
    );
    return normLocYLevCombined;
  }
  this.GetNormLocLevCombined = function() {
    return [this.GetNormLocXLevCombined(), this.GetNormLocYLevCombined()];
  }

  this.SetNormLocX = function (normX, doRedraw=true) {
    this.SetNormLoc(normX, null, {doRedraw:doRedraw}={});
    return currentRawLocXLev0;
  };
  this.SetNormLocY = function (normY, doRedraw=true) {
    this.SetNormLoc(null, normY, {doRedraw:doRedraw}={});
    return currentRawLocYLev0;
  };
  /*
    // EQUATION REARRANGEMENT
    currentRawLocXLev0 = centerRawLocXLev0 + maxMoveStickLev0*(2*normXLev0 - 1);
    currentRawLocXLev1 = centerRawLocXLev1 + maxMoveStickLev0*(2*normXLev1 - 1);
    normXLev0 == (1 + (currentRawLocXLev0 - centerRawLocXLev0) / maxMoveStickLev0)/2.0;
    normXLev1 == (1 + (currentRawLocXLev1 - centerRawLocXLev1) / maxMoveStickLev1)/2.0;

    normLevCombined == (normLev0 + normLev1*relativeJoystickPower) / (1+relativeJoystickPower)
    normLev0 + normLev1*relativeJoystickPower == normLevCombined * (1+relativeJoystickPower)
    normLev0 == normLevCombined*(1+relativeJoystickPower) - normLev1*relativeJoystickPower
    normLev1 == (normLevCombined*(1+relativeJoystickPower) - normLev0) / relativeJoystickPower
   */
  this.SetNormLoc = function (normX, normY, {doRedraw = true, level=null}={}) {
    if (isNullOrUndef(level) || level===-1) {  // change both levels as necessary
      const relativeJoystickPower = 0.2;

      if (!isNullOrUndef(normX)) {
        //const oldNormLocXLev0 = this.GetNormLocX({level:0});
        //const oldNormLocXLev1 = this.GetNormLocX({level:1});
        //const oldNormLocXLevCombined = this.GetNormLocXLevCombined();
        const oldNormLocXLev0 = (1 + (currentRawLocXLev0 - centerRawLocXLev0) / maxMoveStickLev0)/2.0;
        const oldNormLocXLev1 = (1 + (currentRawLocXLev1 - centerRawLocXLev1) / maxMoveStickLev1)/2.0;
        const oldNormLocXLevCombined = (oldNormLocXLev0 + oldNormLocXLev1*relativeJoystickPower) / (1+relativeJoystickPower);

        if ( Math.abs(normX - oldNormLocXLevCombined) >= 0.0001 ) {
          let normXLev0 = normX;
          let normXLev1 = normX;
          currentRawLocXLev0 = centerRawLocXLev0 + maxMoveStickLev0*(2*normXLev0 - 1);
          currentRawLocXLev1 = centerRawLocXLev1 + maxMoveStickLev1*(2*normXLev1 - 1);
        }
        const newNormLocXLev0 = (1 + (currentRawLocXLev0 - centerRawLocXLev0) / maxMoveStickLev0)/2.0;
        const newNormLocXLev1 = (1 + (currentRawLocXLev1 - centerRawLocXLev1) / maxMoveStickLev1)/2.0;
        const newNormLocXLevCombined = (newNormLocXLev0 + newNormLocXLev1*relativeJoystickPower) / (1+relativeJoystickPower);

      }

      if (!isNullOrUndef(normY)) {
        let oldNormLocYLevCombined = this.GetNormLocYLevCombined();
        if ( Math.abs(normY - oldNormLocYLevCombined) >= 0.0001 ) {
          let normYLev0 = normY;
          let normYLev1 = normY;
          currentRawLocYLev0 = centerRawLocYLev0 - maxMoveStickLev0*(2*normYLev0 - 1);
          currentRawLocYLev1 = centerRawLocYLev1 - maxMoveStickLev1*(2*normYLev1 - 1);
        }

      }
      if (doRedraw) redraw();
      const newNormLocLevCombined = this.GetNormLocLevCombined();
      return newNormLocLevCombined;

    } else if (level===0) {
      if (!isNullOrUndef(normX)) currentRawLocXLev0 = centerRawLocXLev0 + maxMoveStickLev0*(2*normX - 1);
      if (!isNullOrUndef(normY)) currentRawLocYLev0 = centerRawLocYLev0 - maxMoveStickLev0*(2*normY - 1);
      if (doRedraw) redraw();
      return [currentRawLocXLev0, currentRawLocYLev0];

    } else if (level>=1) {
      if (!isNullOrUndef(normX)) currentRawLocXLev1 = centerRawLocXLev1 + maxMoveStickLev1*(2*normX - 1);
      if (!isNullOrUndef(normY)) currentRawLocYLev1 = centerRawLocYLev1 - maxMoveStickLev1*(2*normY - 1);
      if (doRedraw) redraw();
      return [currentRawLocXLev1, currentRawLocYLev1];
    }


  };
  this.SetNormLocLev1 = function (normXLev1, normYLev1, doRedraw=true) {
    this.SetNormLoc(normXLev1,normYLev1,{doRedraw: doRedraw, level: 1})
  };

  /**
   * @desc directional value of X move of stick
   * @return Integer from -100 to +100
   */
  this.GetDirLocX = function () {
    return (100 * ((currentRawLocXLev0 - centerRawLocXLev0) / maxMoveStickLev0)).toFixed();
  };
  /**
   * @desc directional value of Y move of stick
   * @return Integer from -100 to +100
   */
  this.GetDirLocY = function () {
    return ((100 * ((currentRawLocYLev0 - centerRawLocYLev0) / maxMoveStickLev0)) * -1).toFixed();
  };
  /**
   * @desc directional value of X and Y move of stick
   * @return Array of integers from -100 to +100
   */
  this.GetDirLoc = function () {
    return [this.GetDirLocX(), this.GetDirLocY()];
  };

  this.GetNormX = this.GetNormLocX;
  this.GetNormY = this.GetNormLocY;
  this.SetNormX = this.SetNormLocX;
  this.SetNormY = this.SetNormLocY;
  this.GetX = this.GetDirLocX;
  this.GetY = this.GetDirLocY;

  /**
   * @desc Get the direction of the cursor as a string that indicates the cardinal points where this is oriented
   * @return String of cardinal point N, NE, E, SE, S, SW, W, NW and C when it is placed in the center
   */
  this.GetCardinalDirection = function () {
    return getCardinalDirection();
  };

};

function isNullOrUndef(myVar) {
  return myVar === null || myVar === undefined;
}
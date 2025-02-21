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
 * 2020-04-03               Roberto D'Amico Correct: InternalRadius when change the size of this.canvas, thanks to 
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

const TWO_PI = 2 * Math.PI;  // circumference of unit circle aka 360 degrees in radians
const DEG = "\u00B0";   // can't just console.log the ° symbol, have to use the unicode symbol to format correctly

function isNullOrUndef(myVar) {
  return myVar === null || myVar === undefined;
}
function numberDictToStr(dict1, fractionDigits=1) {
  if (dict1 instanceof Array) {
    const arr = []
    for (let ind = 0; ind < dict1.length; ind++) {
      if (typeof dict1[ind]==="number" || dict1[ind] instanceof Number) { // instanceof won't work for primitive types
        arr.push(dict1[ind].toFixed(fractionDigits));
      } else arr.push(dict1[ind]);
    }
    return arr;
  } else if (dict1 instanceof Object) {  // don't check for typeof dict===object bc dict=null will return true
    const dict2 = {}
    for (const key in dict1) {
      if (typeof dict1[key]==="number" || dict1[key] instanceof Number) { // instanceof won't work for primitive types
        dict2[key] = dict1[key].toFixed(fractionDigits);
      } else dict2[key] = dict1[key];
    }
    return dict2;
  } else return dict1;

}

/**
 * @desc Principal object that draw a joystick, you only need to initialize the object and suggest the HTML container
 * @constructor
 * @param container {String} - HTML object that contains the Joystick
 * @param parameters (optional) - object with following keys:
 *  title {String} (optional) - The ID of this.canvas (Default value is 'joystick')
 *  width {Int} (optional) - The width of this.canvas, if not specified is setted at width of container object (Default value is the width of container object)
 *  height {Int} (optional) - The height of this.canvas, if not specified is setted at height of container object (Default value is the height of container object)
 *  internalFillColor {String} (optional) - Internal color of Stick (Default value is '#00AA00')
 *  internalLineWidth {Int} (optional) - Border width of Stick (Default value is 2)
 *  internalStrokeColor {String}(optional) - Border color of Stick (Default value is '#003300')
 *  externalLineWidth {Int} (optional) - External reference circomference width (Default value is 2)
 *  externalStrokeColor {String} (optional) - External reference circomference color (Default value is '#008000')
 *  autoReturnToCenter {Bool} (optional) - Sets the behavior of the stick, whether or not, it should return to zero position when released (Default value is True and return to zero)
 *  maxMoveStick {Number} (optional)
 * @param callback {StickStatus} -
 */
export class JoyStick {
  //region Private variables
  // define private variables. Private variables need to be defined up front.
  #directionHorizontalLimitPos;
  #directionHorizontalLimitNeg;
  #directionVerticalLimitPos;
  #directionVerticalLimitNeg;
  //endregion

  //region Static methods
  static getCombinedLevValue(normLev0, normLev1, {relativeJoystickPower=0.2}={}) {// create weighted sum value, then divide by max possible value
    return (normLev0 + normLev1*relativeJoystickPower) / (1+relativeJoystickPower);
  }
  //endregion

  //region constructor
  constructor(container, parameters, callback) {
    this.givenParameters = Object.assign({}, parameters);   // clone dict
    parameters = parameters || {};
    this.callback = callback || ( function (StickStatus) { } );

    this.title = (typeof parameters.title === "undefined" ? "joystick" : parameters.title);
    this.width = (typeof parameters.width === "undefined" ? 0 : parameters.width),
      this.height = (typeof parameters.height === "undefined" ? 0 : parameters.height);

    // Get object that will contain the this.canvas once we create it
    const objContainer = document.getElementById(container);
    // Fixing Unable to preventDefault inside passive event listener due to target being treated as passive in Chrome [Thanks to https://github.com/artisticfox8 for this suggestion]
    objContainer.style.touchAction = "none";
    if (this.width === 0) { this.width = objContainer.clientWidth; }
    if (this.height === 0) { this.height = objContainer.clientHeight; }

    this.internalFillColor = (typeof parameters.internalFillColor === "undefined" ? "#00AA00" : parameters.internalFillColor),
      this.internalLineWidth = (typeof parameters.internalLineWidth === "undefined" ? 2 : parameters.internalLineWidth),
      this.internalStrokeColor = (typeof parameters.internalStrokeColor === "undefined" ? "#003300" : parameters.internalStrokeColor),
      this.externalLineWidth = (typeof parameters.externalLineWidth === "undefined" ? 2 : parameters.externalLineWidth),
      this.externalStrokeColor = (typeof parameters.externalStrokeColor === "undefined" ? "#008000" : parameters.externalStrokeColor),
      this.autoReturnToCenter = (typeof parameters.autoReturnToCenter === "undefined" ? true : parameters.autoReturnToCenter),
      this.moveRelativeToInitialMouseDown = (typeof parameters.moveRelativeToInitialMouseDown === "undefined" ? false : parameters.moveRelativeToInitialMouseDown);

    this.joystickLevels = (typeof parameters.joystickLevels === "undefined" ? 1 : parameters.joystickLevels);

    // Normalized values are from 0 to 1 (inclusive) with 0 being the bottommost or leftmost part of the screen
    if (typeof parameters.startNormLocXLev0 !== "undefined")  this.startNormLocXLev0 = parameters.startNormLocXLev0;
    else if (typeof parameters.startNormLocX !== "undefined")  this.startNormLocXLev0 = parameters.startNormLocX;
    else this.startNormLocXLev0 = 0.5;
    if (typeof parameters.startNormLocYLev0 !== "undefined")  this.startNormLocYLev0 = parameters.startNormLocYLev0;
    else if (typeof parameters.startNormLocY !== "undefined")  this.startNormLocYLev0 = parameters.startNormLocY;
    else this.startNormLocYLev0 = 0.5;
    this.startNormLocXLev1 = (typeof parameters.startNormLocXLev1 === "undefined" ? 0.5 : parameters.startNormLocXLev1),
      this.startNormLocYLev1 = (typeof parameters.startNormLocYLev1 === "undefined" ? 0.0 : parameters.startNormLocYLev1);
    // relativeJoystickPower represents the impact of Lev1 (fine control) compared to Lev0 (general control).
    // Can be any positive number, although logically it should be less than 1 so Lev1 is finer control than Lev0.
    this.relativeJoystickPower = (typeof parameters.relativeJoystickPower === "undefined" ? 0.2 : parameters.relativeJoystickPower);

    this.radiiDifference = (typeof parameters.radiiDifference === "undefined" ? 30 : parameters.radiiDifference);
    this.internalRadiusLev0 = (typeof parameters.internalRadius === "undefined" ? (this.width - (this.width/2 + 10) - this.radiiDifference) / 2 : parameters.internalRadius);
    this.internalRadiusLev1 = (typeof parameters.internalRadiusLev1 === "undefined" ? this.internalRadiusLev0/5 : parameters.internalRadiusLev1);
    this.externalRadius = (typeof parameters.externalRadius === "undefined" ? this.internalRadiusLev0 + this.radiiDifference : parameters.externalRadius);
    this.maxMoveStickBeyondInternalRadius = (typeof parameters.maxMoveStickBeyondInternalRadius === "undefined" ? 5 : parameters.maxMoveStickBeyondInternalRadius);
    // maxMoveStick is how far from the center the joystick can move
    this.maxMoveStickLev0 = (typeof parameters.maxMoveStick === "undefined" ? this.internalRadiusLev0 + this.maxMoveStickBeyondInternalRadius : parameters.maxMoveStick);
    this.maxMoveStickLev1 = (typeof parameters.maxMoveStickLev1 === "undefined" ?
      this.internalRadiusLev0-2*this.internalRadiusLev1 :  // default has subtraction multiplied by 2 because one on each side
      parameters.maxMoveStickLev1);

    this.arrowCount = (typeof parameters.arrowCount === "undefined" ? 0 : parameters.arrowCount);
    this.isRotatable = (typeof parameters.isRotatable === "undefined" ? this.arrowCount>0 : parameters.isRotatable);
    // This degree position refers to the position of the first arrow if there are multiple arrows
    this.startArrowLocDegrees = (typeof parameters.startArrowLocDegrees === "undefined" ? 0 : parameters.startArrowLocDegrees);
    this.minArrowLocDegrees = (typeof parameters.minArrowLocDegrees === "undefined" ? -180 : parameters.minArrowLocDegrees);
    this.maxArrowLocDegrees = (typeof parameters.maxArrowLocDegrees === "undefined" ? +180 : parameters.maxArrowLocDegrees);
    this.arrowCurveRadius = (typeof parameters.arrowCurveRadius === "undefined" ? this.internalRadiusLev0 * 1.5 : parameters.arrowCurveRadius);
    this.arrowCurveDegrees = (typeof parameters.arrowCurveDegrees === "undefined" ? 60 : parameters.arrowCurveDegrees);
    this.arrowHeadLengthDegrees = (typeof parameters.arrowHeadLengthDegrees === "undefined" ? 20 : parameters.arrowHeadLengthDegrees);


    // Create Canvas element and add it in the Container object
    this.canvas = document.createElement("canvas");
    this.canvas.id = this.title;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    objContainer.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d");

    this.pressed = -1; //  -1 means not pressed, 0 means level 0 pressed, 1 means level 1 pressed, "arrow" means arrows pressed
    this.pressedXLev0 = null;
    this.pressedYLev0 = null;
    this.pressedXLev1 = null;
    this.pressedYLev1 = null;
    this.pressedDegrees = null; // for the arrows

    this.#directionHorizontalLimitPos = this.canvas.width / 10;
    this.#directionHorizontalLimitNeg = this.#directionHorizontalLimitPos * -1;
    this.#directionVerticalLimitPos = this.canvas.height / 10;
    this.#directionVerticalLimitNeg = this.#directionVerticalLimitPos * -1;

    this.centerRawLocXLev0 = this.canvas.width / 2;
    this.centerRawLocYLev0 = this.canvas.height / 2;
    this.centerRawLocXLev1 = this.maxMoveStickLev1;
    this.centerRawLocYLev1 = this.maxMoveStickLev1;
    //(1 + (this.currentRawLocXLev0 - this.centerRawLocXLev0) / this.maxMoveStickLev0)/2.0;
    //this.startRawLocXLev0 = this.canvas.width * this.startNormLocXLev0;
    //this.startRawLocYLev0 = this.canvas.height * (1-this.startNormLocYLev0);
    this.startRawLocXLev0 = (this.centerRawLocXLev0-this.maxMoveStickLev0) + this.maxMoveStickLev0*2 * this.startNormLocXLev0;
    this.startRawLocYLev0 = (this.centerRawLocXLev0-this.maxMoveStickLev0) + this.maxMoveStickLev0*2 * (1-this.startNormLocYLev0);
    this.startRawLocXLev1 = this.maxMoveStickLev1*2 * this.startNormLocXLev1;
    this.startRawLocYLev1 = this.maxMoveStickLev1*2 * (1-this.startNormLocYLev1);


    this.setupParameters = {
      title: this.title,
      width: this.width,
      height: this.height,
      directionHorizontalLimitPos: this.#directionHorizontalLimitPos,
      directionHorizontalLimitNeg: this.#directionHorizontalLimitNeg,
      directionVerticalLimitPos: this.#directionVerticalLimitPos,
      directionVerticalLimitNeg: this.directionVerticalLimitNeg,
      internalFillColor: this.internalFillColor,
      internalLineWidth: this.internalLineWidth,
      internalStrokeColor: this.internalStrokeColor,
      externalLineWidth: this.externalLineWidth,
      externalStrokeColor: this.externalStrokeColor,
      autoReturnToCenter: this.autoReturnToCenter,
      moveRelativeToInitialMouseDown: this.moveRelativeToInitialMouseDown,
      startNormLocXLev0: this.startNormLocXLev0,
      startNormLocYLev0: this.startNormLocYLev0,
      startNormLocXLev1: this.startNormLocXLev1,
      startNormLocYLev1: this.startNormLocYLev1,
      relativeJoystickPower: this.relativeJoystickPower,
      radiiDifference: this.radiiDifference,
      internalRadiusLev0: this.internalRadiusLev0,
      internalRadiusLev1: this.internalRadiusLev1,
      externalRadius: this.externalRadius,
      maxMoveStickBeyondInternalRadius: this.maxMoveStickBeyondInternalRadius,
      maxMoveStickLev0: this.maxMoveStickLev0,
      maxMoveStickLev1: this.maxMoveStickLev1,
      centerRawLocXLev0: this.centerRawLocXLev0,
      centerRawLocYLev0: this.centerRawLocYLev0,
      centerRawLocXLev1: this.centerRawLocXLev1,
      centerRawLocYLev1: this.centerRawLocYLev1,
      startRawLocXLev0: this.startRawLocXLev0,
      startRawLocYLev0: this.startRawLocYLev0,
      startRawLocXLev1: this.startRawLocXLev1,
      startRawLocYLev1: this.startRawLocYLev1,
      isRotatable: this.isRotatable,
      arrowCount: this.arrowCount,
      startArrowLocDegrees: this.startArrowLocDegrees,
      minArrowLocDegrees: this.minArrowLocDegrees,
      maxArrowLocDegrees: this.maxArrowLocDegrees,
      arrowCurveRadius: this.arrowCurveRadius,
      arrowCurveDegrees: this.arrowCurveDegrees,
      arrowHeadLengthDegrees: this.arrowHeadLengthDegrees,
    }

    // Variables represent current position of joystick
    this.currentRawLocXLev0 = this.startRawLocXLev0;
    this.currentRawLocYLev0 = this.startRawLocYLev0;
    this.currentRawLocXLev1 = this.startRawLocXLev1;
    this.currentRawLocYLev1 = this.startRawLocYLev1;
    this.currentRawLocDeg = this.startArrowLocDegrees;

    if ("ontouchstart" in document.documentElement) { // Check if the device support the touch or not
      this.canvas.addEventListener("touchstart", event => this.#onTouchStart(event), false);
      document.addEventListener("touchmove", event => this.#onTouchMove(event), false);
      document.addEventListener("touchend", event => this.#onTouchEnd(event), false);
    } else {
      // Use the arrow function notation (event =>) so that this key passes on to internal function (called binding the event listener)
      this.canvas.addEventListener("mousedown", event => this.#onMouseDown(event), false);
      document.addEventListener("mousemove", event => this.#onMouseMove(event), false);
      document.addEventListener("mouseup", event => this.#onMouseUp(event), false);
    }

    // Draw the object
    this.#drawExternal();
    this.#drawInternal();
  }
  //endregion

  /******************************************************
   * Private methods
   *****************************************************/
  //region Private methods
    /**
   * @desc Draw the external circle used as reference position
   */
  #drawExternal() {
    this.context.beginPath();
    this.context.arc(this.centerRawLocXLev0, this.centerRawLocYLev0, this.externalRadius, 0, TWO_PI, false);
    this.context.lineWidth = this.externalLineWidth;
    this.context.strokeStyle = this.externalStrokeColor;
    this.context.stroke();
  }
  /**
   * @desc Draw the internal stick in the current position the user have moved it
   */
  #drawInternal() {
    // prevent circle from being outside the this.canvas
    if (this.currentRawLocXLev0 < this.internalRadiusLev0) {
      //console.log("X1: ", this.currentRawLocXLev0.toFixed(2) + " < " + internalRadiusLev0.toFixed(2) + " -->" + maxMoveStickLev0.toFixed(1));
      this.currentRawLocXLev0 = this.internalRadiusLev0;
    }
    if (this.currentRawLocXLev0 + this.internalRadiusLev0 > this.canvas.width) {
      //console.log("X2: ", this.currentRawLocXLev0.toFixed(2) + " > " + (canvas.width-internalRadiusLev0).toFixed(2) + " -->" + (canvas.width-maxMoveStickLev0).toFixed(1));
      this.currentRawLocXLev0 = this.canvas.width - this.internalRadiusLev0;
    }
    if (this.currentRawLocYLev0 < this.internalRadiusLev0) {
      //console.log("Y1: ", this.currentRawLocYLev0.toFixed(2) + " < " + internalRadiusLev0.toFixed(2) + " -->" + maxMoveStickLev0.toFixed(1));
      this.currentRawLocYLev0 = this.internalRadiusLev0;
    }
    if (this.currentRawLocYLev0 + this.internalRadiusLev0 > this.canvas.height) {
      //console.log("Y2: ", this.currentRawLocYLev0.toFixed(2) + " > " + (canvas.height-internalRadiusLev0).toFixed(2) + " -->" + (canvas.height-maxMoveStickLev0).toFixed(1));
      this.currentRawLocYLev0 = this.canvas.height - this.internalRadiusLev0;
    }

    // prevent the circle from being beyond maxMoveStickLev0
    if ( (this.currentRawLocXLev0-this.centerRawLocXLev0) > this.maxMoveStickLev0) this.currentRawLocXLev0 = this.centerRawLocXLev0 + this.maxMoveStickLev0;
    if ( (this.centerRawLocXLev0-this.currentRawLocXLev0) > this.maxMoveStickLev0) this.currentRawLocXLev0 = this.centerRawLocXLev0 - this.maxMoveStickLev0;
    if ( (this.currentRawLocYLev0-this.centerRawLocYLev0) > this.maxMoveStickLev0) this.currentRawLocYLev0 = this.centerRawLocYLev0 + this.maxMoveStickLev0;
    if ( (this.centerRawLocYLev0-this.currentRawLocYLev0) > this.maxMoveStickLev0) this.currentRawLocYLev0 = this.centerRawLocYLev0 - this.maxMoveStickLev0;

    // Bound the arrow rotation by the min and max
    if (this.currentRawLocDeg < this.minArrowLocDegrees) this.currentRawLocDeg = this.minArrowLocDegrees;
    if (this.currentRawLocDeg > this.maxArrowLocDegrees) this.currentRawLocDeg = this.maxArrowLocDegrees;

    if (this.joystickLevels===2) {
      // prevent the level 2 circle from being beyond maxMoveStickLev1
      if ( this.currentRawLocXLev1-this.centerRawLocXLev1 > this.maxMoveStickLev1) this.currentRawLocXLev1 = this.centerRawLocXLev1 + this.maxMoveStickLev1;
      if ( this.centerRawLocXLev1-this.currentRawLocXLev1 > this.maxMoveStickLev1) this.currentRawLocXLev1 = this.centerRawLocXLev1 - this.maxMoveStickLev1;
      if ( this.currentRawLocYLev1-this.centerRawLocYLev1 > this.maxMoveStickLev1) this.currentRawLocYLev1 = this.centerRawLocYLev1 + this.maxMoveStickLev1;
      if ( this.centerRawLocYLev1-this.currentRawLocYLev1 > this.maxMoveStickLev1) this.currentRawLocYLev1 = this.centerRawLocYLev1 - this.maxMoveStickLev1;
    }
    this.context.beginPath();

    // create radial gradient for fill color
    const grdLev0 = this.context.createRadialGradient(this.centerRawLocXLev0, this.centerRawLocYLev0, 5, this.centerRawLocXLev0, this.centerRawLocYLev0, 200);
    // Light color
    grdLev0.addColorStop(0, this.internalFillColor);
    // Dark color
    grdLev0.addColorStop(1, this.internalStrokeColor);
    this.context.fillStyle = grdLev0;
    this.context.lineWidth = this.internalLineWidth;
    this.context.strokeStyle = this.internalStrokeColor;

    this.context.arc(this.currentRawLocXLev0, this.currentRawLocYLev0, this.internalRadiusLev0, 0, TWO_PI, false);
    this.context.fill();
    this.context.stroke();

    if (this.isRotatable) {
      // Draw arrows
      this.context.lineWidth = this.internalLineWidth * 1.5;

      // Draw tick mark on the Lev0 joystick to indicate rotation on it
      this.context.beginPath();
      this.context.moveTo(
        this.currentRawLocXLev0 + this.internalRadiusLev0*1.0 * Math.cos((this.currentRawLocDeg-90) * Math.PI/180),
        this.currentRawLocYLev0 + this.internalRadiusLev0*1.0 * Math.sin((this.currentRawLocDeg-90) * Math.PI/180));
      this.context.lineTo(
        this.currentRawLocXLev0 + this.internalRadiusLev0*0.7 * Math.cos((this.currentRawLocDeg-90) * Math.PI/180),
        this.currentRawLocYLev0 + this.internalRadiusLev0*0.7 * Math.sin((this.currentRawLocDeg-90) * Math.PI/180));
      this.context.stroke();


      for (let ind=0; ind<this.arrowCount; ind++) {
        const centerDegrees = this.currentRawLocDeg + ind*360/this.arrowCount;

        this.context.strokeStyle = "#CCC";
        // Draw tick mark in the middle of the arrow line
        this.context.beginPath();
        this.context.moveTo(
          this.currentRawLocXLev0 + this.arrowCurveRadius*1.08 * Math.cos(centerDegrees * Math.PI/180),
          this.currentRawLocYLev0 + this.arrowCurveRadius*1.08 * Math.sin(centerDegrees * Math.PI/180));
        this.context.lineTo(
          this.currentRawLocXLev0 + this.arrowCurveRadius*0.92 * Math.cos(centerDegrees * Math.PI/180),
          this.currentRawLocYLev0 + this.arrowCurveRadius*0.92 * Math.sin(centerDegrees * Math.PI/180));
        this.context.stroke();

        this.context.strokeStyle = grdLev0;
        this.context.fillStyle = grdLev0;

        // Draw circle in the middle of the arrow line
        this.context.beginPath();
        this.context.arc(
          this.currentRawLocXLev0 + this.arrowCurveRadius * Math.cos(centerDegrees * Math.PI/180),
          this.currentRawLocYLev0 + this.arrowCurveRadius * Math.sin(centerDegrees * Math.PI/180),
          this.arrowCurveRadius*0.05, 0, TWO_PI, false);
        this.context.fill();

        // Draw arrow curved line
        this.context.beginPath();
        this.context.arc(this.currentRawLocXLev0, this.currentRawLocYLev0, this.arrowCurveRadius,
          (centerDegrees - this.arrowCurveDegrees / 2) * Math.PI / 180,
          (centerDegrees + this.arrowCurveDegrees / 2) * Math.PI / 180, false);
        this.context.stroke();

        // Draw arrowhead that is furthestmost counterclockwise
        this.context.beginPath();
        this.context.moveTo(  // outermost point of arrowhead base
          this.currentRawLocXLev0 + this.arrowCurveRadius * 1.15 * Math.cos((centerDegrees + this.arrowCurveDegrees/2 - this.arrowHeadLengthDegrees/2) * Math.PI / 180),
          this.currentRawLocYLev0 + this.arrowCurveRadius * 1.15 * Math.sin((centerDegrees + this.arrowCurveDegrees/2 - this.arrowHeadLengthDegrees/2) * Math.PI / 180));
        this.context.lineTo(  // innermost point of arrowhead base
          this.currentRawLocXLev0 + this.arrowCurveRadius * 0.85 * Math.cos((centerDegrees + this.arrowCurveDegrees/2 - this.arrowHeadLengthDegrees/2) * Math.PI / 180),
          this.currentRawLocYLev0 + this.arrowCurveRadius * 0.85 * Math.sin((centerDegrees + this.arrowCurveDegrees/2 - this.arrowHeadLengthDegrees/2) * Math.PI / 180));
        this.context.lineTo(  // the acute point of arrowhead
          this.currentRawLocXLev0 + this.arrowCurveRadius * Math.cos((centerDegrees + this.arrowCurveDegrees/2 + this.arrowHeadLengthDegrees/2) * Math.PI / 180),
          this.currentRawLocYLev0 + this.arrowCurveRadius * Math.sin((centerDegrees + this.arrowCurveDegrees/2 + this.arrowHeadLengthDegrees/2) * Math.PI / 180));
        this.context.fill();

        // Draw arrowhead that is furthestmost counterclockwise
        this.context.beginPath();
        this.context.moveTo(  // outermost point of arrowhead base
          this.currentRawLocXLev0 + this.arrowCurveRadius * 1.15 * Math.cos((centerDegrees - (this.arrowCurveDegrees/2 - this.arrowHeadLengthDegrees/2)) * Math.PI / 180),
          this.currentRawLocYLev0 + this.arrowCurveRadius * 1.15 * Math.sin((centerDegrees - (this.arrowCurveDegrees/2 - this.arrowHeadLengthDegrees/2)) * Math.PI / 180));
        this.context.lineTo(  // innermost point of arrowhead base
          this.currentRawLocXLev0 + this.arrowCurveRadius * 0.85 * Math.cos((centerDegrees - (this.arrowCurveDegrees/2 - this.arrowHeadLengthDegrees/2)) * Math.PI / 180),
          this.currentRawLocYLev0 + this.arrowCurveRadius * 0.85 * Math.sin((centerDegrees - (this.arrowCurveDegrees/2 - this.arrowHeadLengthDegrees/2)) * Math.PI / 180));
        this.context.lineTo(  // the acute point of arrowhead
          this.currentRawLocXLev0 + this.arrowCurveRadius * Math.cos((centerDegrees - (this.arrowCurveDegrees/2 + this.arrowHeadLengthDegrees/2)) * Math.PI / 180),
          this.currentRawLocYLev0 + this.arrowCurveRadius * Math.sin((centerDegrees - (this.arrowCurveDegrees/2 + this.arrowHeadLengthDegrees/2)) * Math.PI / 180));
        this.context.fill();
      }
    }

    if (this.joystickLevels===2) {
      // Get Lev1 coordinates relative to the entire canvas, not just Lev1 relative to Lev0
      const currentRawLocXLev1Canvas = this.currentRawLocXLev1 - this.centerRawLocXLev1 + this.currentRawLocXLev0;
      const currentRawLocYLev1Canvas = this.currentRawLocYLev1 - this.centerRawLocYLev1 + this.currentRawLocYLev0;
      // Get center of the Lev1 area relative to the entire canvas
      const centerRawLocXLev1Canvas = this.currentRawLocXLev0;
      const centerRawLocYLev1Canvas = this.currentRawLocYLev0;

      this.context.beginPath();

      const grdLev1 = this.context.createRadialGradient(
        centerRawLocXLev1Canvas, centerRawLocYLev1Canvas, 1,
        centerRawLocXLev1Canvas, centerRawLocYLev1Canvas, this.maxMoveStickLev1 * 2);
      this.internalFillColorLev1 = this.internalFillColor;  //"#0000AA";
      this.internalStrokeColorLev1 = this.internalStrokeColor;  //"#000033";
      this.internalLineWidthLev1 = this.internalLineWidth;
      grdLev1.addColorStop(0, this.internalFillColorLev1);  // Light color
      grdLev1.addColorStop(1, this.internalStrokeColorLev1);  // Dark color
      this.context.fillStyle = grdLev1;
      this.context.lineWidth = this.internalLineWidthLev1;
      this.context.strokeStyle = this.internalStrokeColorLev1;

      this.context.arc(currentRawLocXLev1Canvas, currentRawLocYLev1Canvas, this.internalRadiusLev1, 0, TWO_PI, false);
      this.context.fill();
      this.context.stroke();
    }

  }

  #redraw() {
    // Delete this.canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Redraw object
    this.#drawExternal();
    this.#drawInternal();
  }

  #updateStickStatus(newCurrentRawLocXLev0, newCurrentRawLocYLev0,
                     newCurrentRawLocXLev1=null, newCurrentRawLocYLev1=null, newcurrentRawLocDeg=null) {
    StickStatus.rawLocXLev0 = newCurrentRawLocXLev0;
    StickStatus.rawLocYLev0 = newCurrentRawLocYLev0;
    StickStatus.dirLocXLev0 =   (100 * (newCurrentRawLocXLev0 - this. centerRawLocXLev0) / this.maxMoveStickLev0).toFixed();
    StickStatus.dirLocYLev0 =   (100 * (newCurrentRawLocYLev0 - this.centerRawLocYLev0) / this.maxMoveStickLev0  * -1).toFixed();
    StickStatus.normLocXLev0 = (1 + (newCurrentRawLocXLev0 - this.centerRawLocXLev0) / this.maxMoveStickLev0)/2.0;
    StickStatus.normLocYLev0 = (1 + (newCurrentRawLocYLev0 - this.centerRawLocYLev0) / this.maxMoveStickLev0  * -1)/2.0;

    if (!isNullOrUndef(newCurrentRawLocXLev1) && !isNullOrUndef(newCurrentRawLocYLev1)) {
      StickStatus.rawLocXLev1 = newCurrentRawLocXLev1;
      StickStatus.rawLocYLev1 = newCurrentRawLocYLev1;
      StickStatus.dirLocXLev1 =   (100 * (newCurrentRawLocXLev1 - this.centerRawLocXLev1) / this.maxMoveStickLev1).toFixed();
      StickStatus.dirLocYLev1 =   (100 * (newCurrentRawLocYLev1 - this.centerRawLocYLev1) / this.maxMoveStickLev1  * -1).toFixed();
      StickStatus.normLocXLev1 = (1 + (newCurrentRawLocXLev1 - this.centerRawLocXLev1) / this.maxMoveStickLev1)/2.0;
      StickStatus.normLocYLev1 = (1 + (newCurrentRawLocYLev1 - this.centerRawLocYLev1) / this.maxMoveStickLev1  * -1)/2.0;

    }
    if (!isNullOrUndef(newcurrentRawLocDeg)) {
      StickStatus.rawLocDeg = newcurrentRawLocDeg;
      const range = this.maxArrowLocDegrees - this.minArrowLocDegrees;
      StickStatus.normLocDeg = (newcurrentRawLocDeg - this.minArrowLocDegrees)/range;
    }

    StickStatus.cardinalDirection = this.#getCardinalDirection();
  }
  /**
   * @desc Events for manage mouse and touch
   */
  #onTouchStart(event) {
    this.#onMouseDown(event, 0);  // make button 0 to assume left click
  }
  #onTouchMove(event) {
    if (event.targetTouches[0].target === this.canvas) {
      this.#onMouseMove(event);
    }
  }
  #onTouchEnd(event) {
    this.#onMouseUp(event);
  }
  #onMouseDown(event, button=null) {
    if (isNullOrUndef(button)) button = event.button;
    if (button===0) {  // 0 is left click, 1 is middle, 2 is right click
      const locs = this.#getCorrectedPositionOnCanvas(event.pageX, event.pageY);
      const locLev0 = locs[0];
      this.pressedXLev0 = locLev0.x - this.currentRawLocXLev0;  // pressed position relative to the circle center
      this.pressedYLev0 = locLev0.y - this.currentRawLocYLev0;
      if (this.joystickLevels===2) {
        const locLev1 = locs[1];
        this.pressedXLev1 = locLev1.x- this.currentRawLocXLev1;  // pressed position relative to the circle center
        this.pressedYLev1 = locLev1.y - this.currentRawLocYLev1;
      }
      if (this.isRotatable) {
        let locAngleDegrees = Math.atan2(this.pressedYLev0, this.pressedXLev0) * 180/Math.PI;
        // make locAngleDegrees within 360 degrees of this.currentRawLocDeg so that this.currentRawLocDeg doesn't have to be bounded [-180, 180]
        while (locAngleDegrees - this.currentRawLocDeg <= -180)  locAngleDegrees += 360;
        while (locAngleDegrees - this.currentRawLocDeg > 180)  locAngleDegrees -= 360;
        this.pressedDegrees = locAngleDegrees - this.currentRawLocDeg;

      }

      if (Math.abs(this.pressedXLev1) <= this.internalRadiusLev1  && Math.abs(this.pressedYLev1) <= this.internalRadiusLev1) {
        // clicked level 2 joystick
        this.pressed = 1;
        this.pressedXLev0 = null;
        this.pressedYLev0 = null;
        this.pressedDegrees = null;
      } else if (!this.moveRelativeToInitialMouseDown || (Math.abs(this.pressedXLev0) <= this.internalRadiusLev0 && Math.abs(this.pressedYLev0) <= this.internalRadiusLev0) ) {
        // clicked level 1 joystick (or area around it if moveRelativeToInitialMouseDown is false)
        this.pressed = 0;
        this.pressedXLev1 = null;
        this.pressedYLev1 = null;
      } else if (Math.abs(this.pressedXLev0) <= this.arrowCurveRadius*1.5 && Math.abs(this.pressedYLev0) <= this.arrowCurveRadius*1.5) {
        // clicked arrows
        this.pressed = "arrow";
        this.pressedXLev1 = null;
        this.pressedYLev1 = null;
      } else {
        this.pressed = -1;
        this.pressedXLev0 = null;
        this.pressedYLev0 = null;
        this.pressedXLev1 = null;
        this.pressedYLev1 = null;
        this.pressedDegrees = null;
      }
    }

  }
  /* To simplify this code there was a new experimental feature here:
  https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/offsetX
  However, it is present only in the mouse case, but not the touch case */
  #onMouseMove(event) {
    if (this.pressed >= 0 || typeof this.pressed === "string" || this.pressed instanceof String) {
      const locs = this.#getCorrectedPositionOnCanvas(event.pageX, event.pageY);
      const locLev0 = locs[0];
      if (this.pressed===0) {
        if (this.moveRelativeToInitialMouseDown) {
          this.currentRawLocXLev0 = locLev0.x - this.pressedXLev0;
          this.currentRawLocYLev0 = locLev0.y - this.pressedYLev0;
        } else {
          this.currentRawLocXLev0 = locLev0.x;
          this.currentRawLocYLev0 = locLev0.y;
        }
      } else if (this.joystickLevels===2 && this.pressed===1) {
        const locLev1 = locs[1];
        this.currentRawLocXLev1 = locLev1.x - this.pressedXLev1;
        this.currentRawLocYLev1 = locLev1.y - this.pressedYLev1;

      } else if (this.pressed==="arrow") {  // for degree rotation
        const locFromCenterLev0 = {x:locLev0.x-this.currentRawLocXLev0, y:locLev0.y-this.currentRawLocYLev0}
        let clickDegrees = Math.atan2(locFromCenterLev0.y, locFromCenterLev0.x)*180/Math.PI;
        // make clickDegrees within 360 degrees of this.currentRawLocDeg so that this.currentRawLocDeg doesn't have to be bounded [-180, 180]
        while (clickDegrees - this.currentRawLocDeg <= -180)  clickDegrees += 360;
        while (clickDegrees - this.currentRawLocDeg > 180)  clickDegrees -= 360;
        this.currentRawLocDeg = clickDegrees - this.pressedDegrees;
      }

      this.#redraw();

      // Set attribute of callback
      this.#updateStickStatus(
        this.currentRawLocXLev0, this.currentRawLocYLev0,
        this.currentRawLocXLev1, this.currentRawLocYLev1, this.currentRawLocDeg);
      this.callback(StickStatus);
    }
  }
  #onMouseUp(event) {
    this.pressed = -1;  // -1 is not pressed
    this.pressedXLev0 = null;
    this.pressedYLev0 = null;
    this.pressedXLev1 = null;
    this.pressedYLev1 = null;
    this.pressedDegrees = null;
    // If required reset position store variable
    if (this.autoReturnToCenter) {
      this.currentRawLocXLev0 = this.startRawLocXLev0;
      this.currentRawLocYLev0 = this.startRawLocYLev0;
    }
    this.#redraw();

    // Set attribute of callback
    this.#updateStickStatus(
      this.currentRawLocXLev0, this.currentRawLocYLev0,
      this.currentRawLocXLev1, this.currentRawLocYLev1, this.currentRawLocDeg);
    this.callback(StickStatus);
  }
  #getCorrectedPositionOnCanvas(uncorrectedX, uncorrectedY) {
    // uncorrected coordinates are relative to the entire webpage
    // corrected is relative to the this.canvas
    let correctedX, correctedY;
    // Manage offset
    if (this.canvas.offsetParent.tagName.toUpperCase() === "BODY") {
      correctedX = uncorrectedX - this.canvas.offsetLeft;
      correctedY = uncorrectedY - this.canvas.offsetTop;
    } else {
      correctedX = uncorrectedX - this.canvas.offsetParent.offsetLeft;
      correctedX = uncorrectedY - this.canvas.offsetParent.offsetTop;
    }
    let correctedPositions =  [ {
      x: correctedX,
      y: correctedY,
    } ];
    if (this.joystickLevels===2) {
      correctedPositions.push({
        x: correctedX - this.currentRawLocXLev0 + this.centerRawLocXLev1,
        y: correctedY - this.currentRawLocYLev0 + this.centerRawLocYLev1,
      });
    }
    return correctedPositions;
  }

  /**
   *
   * @returns {string}
   */
  #getCardinalDirection() {
    let result = "";
    let horizontal = this.currentRawLocXLev0 - this.centerRawLocXLev0;
    let vertical = this.currentRawLocYLev0 - this.centerRawLocYLev0;

    if (vertical >= this.#directionVerticalLimitNeg && vertical <= this.#directionVerticalLimitPos) {
      result = "C";
    }
    if (vertical < this.#directionVerticalLimitNeg) {
      result = "N";
    }
    if (vertical > this.#directionVerticalLimitPos) {
      result = "S";
    }

    if (horizontal < this.#directionHorizontalLimitNeg) {
      if (result === "C") {
        result = "W";
      } else {
        result += "W";
      }
    }
    if (horizontal > this.#directionHorizontalLimitPos) {
      if (result === "C") {
        result = "E";
      } else {
        result += "E";
      }
    }

    return result;
  }

  //endregion Private

  /******************************************************
   * Public methods
   *****************************************************/
  //region Public methods
  /**
   * @desc Get the parameters given when initializing this object
   * @return dict
   */
  getGivenParameters() {
    return this.givenParameters;
  }
  /**
   * @desc Get the parameters that were calculated initially during setting up the object
   * @return dict
   */
  getSetupParameters() {
    return this.setupParameters;
  }
  /**
   * @desc Get the parameters that were calculated initially during setting up the object
   * @return dict
   */
  getWorkingParameters() {
    return {
      currentRawLocXLev0: this.currentRawLocXLev0,
      currentRawLocYLev0: this.currentRawLocYLev0,
      currentRawLocXLev1: this.currentRawLocXLev1,
      currentRawLocYLev1: this.currentRawLocYLev1,
      currentRawLocDeg: this.currentRawLocDeg,
      pressed: this.pressed,
      pressedXLev0: this.pressedXLev0,
      pressedYLev0: this.pressedYLev0,
      pressedXLev1: this.pressedXLev1,
      pressedYLev1: this.pressedYLev1,
      pressedDegrees: this.pressedDegrees,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * @desc The width of this.canvas
   * @return Number of pixel width
   */
  getWidth() {
    return this.canvas.width;
  }

  /**
   * @desc The height of this.canvas
   * @return Number of pixel height
   */
  getHeight() {
    return this.canvas.height;
  }

  /**
   * @desc The X position of the cursor relative to the this.canvas that contains it and to its dimensions
   * @param {number?} level
   * @return Number that indicate relative position
   */
  getRawLocX({level=null}={}) {
    if (isNullOrUndef(level) || level===0) return this.currentRawLocXLev0;
    else if (level===1) return this.currentRawLocXLev1;
  }
  /**
   * @desc The Y position of the cursor relative to the this.canvas that contains it and to its dimensions
   * @param {number?} level
   * @return Number that indicates relative position
   */
  getRawLocY({level=null}={}) {
    if (isNullOrUndef(level) || level===0) return this.currentRawLocYLev0;
    else if (level===1) return this.currentRawLocYLev1;
  }
  getRawLocDeg({level=null}={}) {
    if (isNullOrUndef(level) || level===0) return this.currentRawLocDeg;
    else return undefined;
  }
  /**
   * @desc The X and Y positions of the cursor relative to the this.canvas that contains it and to its dimensions
   * @param {number?} level
   * @return Array of numbers that indicate relative position
   */
  getRawLoc({level=null}={}) {
    return [this.getRawLocX({level:level}), this.getRawLocY({level:level}), this.getRawLocDeg({level:level})];
  }
  setRawLoc(rawLocX, rawLocY, rawLocDeg, {doRedraw=true, level=null}={}) {
    if (isNullOrUndef(level) || level===0) {
      if (!isNullOrUndef(rawLocX)) this.currentRawLocXLev0 = rawLocX;
      if (!isNullOrUndef(rawLocY)) this.currentRawLocYLev0 = rawLocY;
      if (!isNullOrUndef(rawLocY)) this.currentRawLocDeg = rawLocDeg;
      if (doRedraw) this.#redraw();
      return [this.currentRawLocXLev0, this.currentRawLocYLev0];
    } else if (level===1) {
      if (!isNullOrUndef(rawLocX)) this.currentRawLocXLev1 = rawLocX;
      if (!isNullOrUndef(rawLocY)) this.currentRawLocYLev1 = rawLocY;
      if (!isNullOrUndef(rawLocY)) this.currentRawLocDeg = rawLocDeg;
      if (doRedraw) this.#redraw();
      return [this.currentRawLocXLev1, this.currentRawLocYLev1, this.currentRawLocDeg];
    }
  }

  /**
   * @desc Normalized value of X move of stick
   * @param {number?} level
   * @return Float from 0 to 1
   */
  getNormLocX({level=null}={}) {
    if (isNullOrUndef(level) || level===-1) return this.getNormLocXLevCombined();
    if (level===0) return (1 + (this.currentRawLocXLev0 - this.centerRawLocXLev0) / this.maxMoveStickLev0)/2.0;
    else if (level===1) return (1 + (this.currentRawLocXLev1 - this.centerRawLocXLev1) / this.maxMoveStickLev1)/2.0;
  }

  /**
   * @desc Normalized value of Y move of stick
   * @param {number?} level
   * @return Float from 0 to 1
   */
  getNormLocY({level=null}={}) {
    if (isNullOrUndef(level) || level===-1) return this.getNormLocYLevCombined();
    if (level===0) return (1 + (this.currentRawLocYLev0 - this.centerRawLocYLev0) / this.maxMoveStickLev0  * -1)/2.0;
    else if (level===1) return (1 + (this.currentRawLocYLev1 - this.centerRawLocYLev1) / this.maxMoveStickLev1  * -1)/2.0;
  }
  getNormLocDeg({level=null}={}) {
    if (isNullOrUndef(level) || level===0) {
      if (isNullOrUndef(this.minArrowLocDegrees) || isNullOrUndef(this.maxArrowLocDegrees) || isNullOrUndef(this.currentRawLocDeg)) {
        return null;
      } else {
        const range = this.maxArrowLocDegrees - this.minArrowLocDegrees;
        return (this.currentRawLocDeg - this.minArrowLocDegrees)/range;
      }
    } else return undefined;
  }
  /**
   * @desc Normalized value of X and Y move of stick
   * @param {number?} level
   * @return Array of floats from 0 to 1
   */
  getNormLoc({level=null}={}) {
    if (isNullOrUndef(level) || level===-1) return this.getNormLocLevCombined();
    else return [this.getNormLocX({level:level}), this.getNormLocY({level:level}), this.getNormLocDeg({level:level})];
    //if (level===0) return [this.getNormLocX(), this.getNormLocY(), this.getNormLocDeg()];
    //else if (level===1) return [this.getNormLocX({level:1}), this.getNormLocY({level:1}), this.getNormLocDeg({level:1})];
  }

  getNormLocXLevCombined() {
    const normLocXLevCombined = JoyStick.getCombinedLevValue(
      this.getNormLocX({level:0}),
      this.getNormLocX({level:1}),
      {relativeJoystickPower: this.relativeJoystickPower}
    );
    return normLocXLevCombined;
  }
  getNormLocYLevCombined() {
    const normLocYLevCombined = JoyStick.getCombinedLevValue(
      this.getNormLocY({level:0}),
      this.getNormLocY({level:1}),
      {relativeJoystickPower: this.relativeJoystickPower}
    );
    return normLocYLevCombined;
  }
  getNormLocLevCombined() {
    return [this.getNormLocXLevCombined(), this.getNormLocYLevCombined(), this.getNormLocDeg()];
  }

  setNormLocX(normX, {doRedraw=true}={}) {
    this.setNormLoc(normX, null, null,{doRedraw:doRedraw});
    return this.currentRawLocXLev0;
  }
  setNormLocY(normY, {doRedraw=true}={}) {
    this.setNormLoc(null, normY, null,{doRedraw:doRedraw});
    return this.currentRawLocYLev0;
  }
  setNormLocDeg(normDeg, {doRedraw=true}={}) {
    this.setNormLoc(null, null, normDeg,{doRedraw:doRedraw});
    return this.currentRawLocDeg;
  }

  /*
    // EQUATION REARRANGEMENT MATH
    this.currentRawLocXLev0 = this.centerRawLocXLev0 + maxMoveStickLev0*(2*normXLev0 - 1);
    this.currentRawLocXLev1 = this.centerRawLocXLev1 + maxMoveStickLev0*(2*normXLev1 - 1);
    normXLev0 == (1 + (currentRawLocXLev0 - this.centerRawLocXLev0) / maxMoveStickLev0)/2.0;
    normXLev1 == (1 + (currentRawLocXLev1 - this.centerRawLocXLev1) / maxMoveStickLev1)/2.0;

    normLevCombined == (normLev0 + normLev1*relativeJoystickPower) / (1+relativeJoystickPower)
    normLev0 + normLev1*relativeJoystickPower == normLevCombined * (1+relativeJoystickPower)
    normLev0 == normLevCombined*(1+relativeJoystickPower) - normLev1*relativeJoystickPower
    normLev1 == (normLevCombined*(1+relativeJoystickPower) - normLev0) / relativeJoystickPower
   */
  setNormLoc(normX, normY, normDeg, {doRedraw = true, level=null}={}) {
    if (isNullOrUndef(level) || level===-1) {  // change both levels as necessary

      if (!isNullOrUndef(normX)) {
        //const oldNormLocXLev0 = this.getNormLocX({level:0});
        //const oldNormLocXLev1 = this.getNormLocX({level:1});
        //const oldNormLocXLevCombined = this.getNormLocXLevCombined();
        const oldNormLocXLev0 = (1 + (this.currentRawLocXLev0 - this.centerRawLocXLev0) / this.maxMoveStickLev0)/2.0;
        const oldNormLocXLev1 = (1 + (this.currentRawLocXLev1 - this.centerRawLocXLev1) / this.maxMoveStickLev1)/2.0;
        const oldNormLocXLevCombined = (oldNormLocXLev0 + oldNormLocXLev1*this.relativeJoystickPower) / (1+this.relativeJoystickPower);

        if ( Math.abs(normX - oldNormLocXLevCombined) >= 0.0001 ) {
          let normXLev0 = normX;
          let normXLev1 = normX;
          this.currentRawLocXLev0 = this.centerRawLocXLev0 + this.maxMoveStickLev0*(2*normXLev0 - 1);
          this.currentRawLocXLev1 = this.centerRawLocXLev1 + this.maxMoveStickLev1*(2*normXLev1 - 1);
        }
        const newNormLocXLev0 = (1 + (this.currentRawLocXLev0 - this.centerRawLocXLev0) / this.maxMoveStickLev0)/2.0;
        const newNormLocXLev1 = (1 + (this.currentRawLocXLev1 - this.centerRawLocXLev1) / this.maxMoveStickLev1)/2.0;
        const newNormLocXLevCombined = (newNormLocXLev0 + newNormLocXLev1*this.relativeJoystickPower) / (1+this.relativeJoystickPower);
      }

      if (!isNullOrUndef(normY)) {
        let oldNormLocYLevCombined = this.getNormLocYLevCombined();
        if ( Math.abs(normY - oldNormLocYLevCombined) >= 0.0001 ) {
          let normYLev0 = normY;
          let normYLev1 = normY;
          this.currentRawLocYLev0 = this.centerRawLocYLev0 - this.maxMoveStickLev0*(2*normYLev0 - 1);
          this.currentRawLocYLev1 = this.centerRawLocYLev1 - this.maxMoveStickLev1*(2*normYLev1 - 1);
        }
      }

      if (!isNullOrUndef(normDeg)) {
        //console.log(normDeg)
        this.currentRawLocDeg = this.minArrowLocDegrees + (this.maxArrowLocDegrees-this.minArrowLocDegrees)*normDeg;
      }

      if (doRedraw) this.#redraw();
      const newNormLocLevCombined = this.getNormLocLevCombined();
      return newNormLocLevCombined;

    } else if (level===0) {
      if (!isNullOrUndef(normX)) this.currentRawLocXLev0 = this.centerRawLocXLev0 + this.maxMoveStickLev0*(2*normX - 1);
      if (!isNullOrUndef(normY)) this.currentRawLocYLev0 = this.centerRawLocYLev0 - this.maxMoveStickLev0*(2*normY - 1);
      if (!isNullOrUndef(normDeg)) this.currentRawLocDeg = this.minArrowLocDegrees + (this.maxArrowLocDegrees-this.minArrowLocDegrees)*normDeg;
      if (doRedraw) this.#redraw();
      return [this.currentRawLocXLev0, this.currentRawLocYLev0];

    } else if (level===1) {
      if (!isNullOrUndef(normX)) this.currentRawLocXLev1 = this.centerRawLocXLev1 + this.maxMoveStickLev1*(2*normX - 1);
      if (!isNullOrUndef(normY)) this.currentRawLocYLev1 = this.centerRawLocYLev1 - this.maxMoveStickLev1*(2*normY - 1);
      if (doRedraw) this.#redraw();
      return [this.currentRawLocXLev1, this.currentRawLocYLev1];
    }
  }

  /**
   * @desc directional value of X move of stick
   * @return Integer from -100 to +100
   */
  getDirLocX({level=null}={}) {
    if (isNullOrUndef(level) || level===0) {
      return (100 * ((this.currentRawLocXLev0 - this.centerRawLocXLev0) / this.maxMoveStickLev0)).toFixed();
    } else if (level===1) {
      return (100 * ((this.currentRawLocXLev1 - this.centerRawLocXLev1) / this.maxMoveStickLev1)).toFixed();
    }
  }
  /**
   * @desc directional value of Y move of stick
   * @return Integer from -100 to +100
   */
  getDirLocY({level=null}={}) {
    if (isNullOrUndef(level) || level===0) {
      return (100 * ((this.currentRawLocYLev0 - this.centerRawLocYLev0) / this.maxMoveStickLev0)).toFixed();
    } else if (level===1) {
      return (100 * ((this.currentRawLocYLev1 - this.centerRawLocYLev1) / this.maxMoveStickLev1)).toFixed();
    }
  }
  getDirLocDeg({level=null}={}) {
    if (isNullOrUndef(level) || level===0) {
      if (isNullOrUndef(this.minArrowLocDegrees) || isNullOrUndef(this.maxArrowLocDegrees) || isNullOrUndef(this.currentRawLocDeg)) {
        return null;
      } else {
        const range = this.maxArrowLocDegrees - this.minArrowLocDegrees;
        const middle = (this.maxArrowLocDegrees + this.minArrowLocDegrees)/2;
        return (100 * ((this.currentRawLocDeg - middle / range)).toFixed());
      }
    } else return undefined;
  }
  /**
   * @desc directional value of X and Y move of stick
   * @return Array of integers from -100 to +100
   */
  getDirLoc({level=null}={}) {
    return [this.getDirLocX({level:level}), this.getDirLocY({level:level}), this.getDirLocDeg({level:level})];
  }


  /**
   * @desc Get the direction of the cursor as a string that indicates the cardinal points where this is oriented
   * @return String of cardinal point N, NE, E, SE, S, SW, W, NW and C when it is placed in the center
   */
  getCardinalDirection() {
    return this.#getCardinalDirection();
  }

  //endregion

}

// To allow backwards compatibility, allow function names like GetWidth() that reroute to the new function names ie getWidth()

const oldFnNames = [
  "GetGivenParameters",
  "GetSetupParameters",
  "GetWorkingParameters",
  "GetWidth",
  "GetHeight",
  "GetRawLocX",
  "GetRawLocY",
  "GetRawLocDeg",
  "GetRawLoc",
  "SetRawLoc",
  "GetNormLocX",
  "GetNormLocY",
  "GetNormLocDeg",
  "GetNormLoc",
  "GetCombinedLevValue",
  "GetNormLocXLevCombined",
  "GetNormLocYLevCombined",
  "GetNormLocLevCombined",
  "SetNormLocX",
  "SetNormLocY",
  "SetNormLocDeg",
  "SetNormLoc",
  "GetDirLocX",
  "GetDirLocY",
  "GetDirLocDeg",
  "GetDirLoc",
  "GetCardinalDirection",
]

for (let ind=0; ind < oldFnNames.length; ind++) {
  const oldFnName = oldFnNames[ind];
  // Get newFnName by converting case of first letter ie GetWidth -> getWidth
  const newFnName = oldFnName.substring(0,1).toLowerCase() + oldFnName.substring(1);
  if (!isNullOrUndef(JoyStick.prototype[newFnName])) {
    //JoyStick.prototype.GetNormLocX = JoyStick.prototype.getNormLocX;
    JoyStick.prototype[oldFnName] = JoyStick.prototype[newFnName];
  }
}


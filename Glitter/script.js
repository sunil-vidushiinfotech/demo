//---

'use strict';

//---

console.clear();

//---

let w = 0;
let h = 0;
let initialWidth = w;
let initialHeight = h;

let animationFrame = null;
let isTouchDevice = false;

const canvas = document.createElement( 'canvas' );
const context = canvas.getContext( '2d', { willReadFrequently: true } );

let imageData = null;
let data = null;

const center = { x: w / 2, y: h / 2 };
const border = { left: 1, top: 1, right: w, bottom: h };

let pointerPos = { x: center.x, y: center.y };
let pointerDown = false;
let pointerMoveTimeout;

const pointerMoveTimeoutTime = 2500;

//---

const text = [

    { text: '250', x: 0, y: 0, ox: 0, oy: 0, offsetX: 0, offsetY: -60, fontSizeFactor: 2.25, fontWeight: 'bold', fontSize: 0 }, 
    { text: 'FOLLOWERS', x: 0, y: 0, ox: 0, oy: 0, offsetX: 0, offsetY: 180, fontSizeFactor: 8.5, fontWeight: 'bold', fontSize: 0 }

];

const dotsCountMax = 20164;
const dotsRadius = 3;
const dotsDistance = 0;
const dotsDiameter = dotsRadius * 2;
const dotsSpeed = 10;
const dotsWobbleFactor = 0.95;
const dotsWobbleSpeed = 0.05;
const dotsMaxEscapeRouteLengthBasis = 100;
let dotsMaxEscapeRouteLength = 100;
const dotsMouseDistanceSensitivitySpeed = 5;
const dotsMouseDistanceSensitivityMax = 250;
const dotsMouseDistanceSensitivityMinBasis = 100;
let dotsMouseDistanceSensitivityMin = 100;
let dotsMouseDistanceSensitivity = dotsMouseDistanceSensitivityMin;
let dotsHolder = [];
let dotsCount = dotsCountMax;

let introPath = [];
let introInterval = null;
let introIndex = 0;
let introPathCoordinatesCount = 256;
let introSpeedBasis = 10;
let introSpeed = introSpeedBasis;


//---

function init() {

    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

    //---

    if ( isTouchDevice === true ) {

        canvas.addEventListener( 'touchmove', cursorMoveHandler, false );
        canvas.addEventListener( 'touchend', cursorLeaveHandler, false );
        canvas.addEventListener( 'touchcancel ', cursorLeaveHandler, false );

    } else {

        canvas.addEventListener( 'pointermove', cursorMoveHandler, false );
        canvas.addEventListener( 'pointerdown', cursorDownHandler, false );
        canvas.addEventListener( 'pointerup', cursorUpHandler, false );
        canvas.addEventListener( 'pointerleave', cursorLeaveHandler, false );

    }

    //---

    initialWidth = calculateDimensions( dotsCount, dotsDiameter, dotsDistance, dotsMouseDistanceSensitivityMax );
    initialHeight = initialWidth;

    //---

    document.body.appendChild( canvas );

    window.addEventListener( 'resize', onResize, false );

    restart();

}

function onResize( event ) {
    
    restart();

}

function calculateDimensions( dotsCount, dotsDiameter, dotsDistance, dotsMouseDistanceSensitivityMax ) {

    return Math.ceil( Math.sqrt( dotsCount ) ) * ( dotsDiameter + dotsDistance ) + ( dotsMouseDistanceSensitivityMax * 1 );

}

function restart() {

    const innerWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const innerHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

    //---

    const changeDimensions = ( c ) => {

        let dotsCountSQRT = Math.ceil( Math.sqrt( dotsCount ) );

        dotsCountSQRT += c;
        dotsCount = dotsCountSQRT * dotsCountSQRT;

        w = calculateDimensions( dotsCount, dotsDiameter, dotsDistance, dotsMouseDistanceSensitivityMax );
        h = w;

    };

    //---

    w = calculateDimensions( dotsCount, dotsDiameter, dotsDistance, dotsMouseDistanceSensitivityMax );
    h = w;

    if ( w < innerWidth || h < innerHeight ) {

        while ( ( w < innerWidth || h < innerHeight ) && dotsCount < dotsCountMax ) changeDimensions( 2 );

    }

    if ( w > innerWidth || h > innerHeight ) {

        while ( w > innerWidth || h > innerHeight ) changeDimensions( -2 );

    }

    //---

    canvas.width = w;
    canvas.height = h;

    imageData = context.getImageData( 0, 0, w, h );
    data = imageData.data;
    
    //---
    
    center.x = w / 2;
    center.y = h / 2;
    
    pointerPos.x = -10000;
    pointerPos.y = -10000;
    
    border.right = w;
    border.bottom = h;

    //---

    initTextCanvas();

    const scaleFactor = Math.min( w / initialWidth, h / initialHeight );
    const calculateFontSize = ( w, baseFontSize, scaleFactor ) => Math.round( ( w / baseFontSize ) * scaleFactor );
    const adjustOffset = ( offset, scaleFactor ) => offset * scaleFactor;

    text.forEach( ( t ) => {

        t.ox = adjustOffset( t.offsetX, scaleFactor );
        t.oy = adjustOffset( t.offsetY, scaleFactor );
        t.x = center.x + t.ox;
        t.y = center.y + t.oy;
        t.fontSize = calculateFontSize( w, t.fontSizeFactor, scaleFactor );

        drawTextToCanvas( t );

    } );

    //---

    dotsMouseDistanceSensitivityMin = Math.round( dotsMouseDistanceSensitivityMinBasis * scaleFactor );
    dotsMaxEscapeRouteLength = Math.round( dotsMaxEscapeRouteLengthBasis * scaleFactor );
    
    //---
    
    removeDots();
    addDots();
    
    //---
    
    if ( animationFrame != null ) {
    
        cancelAnimFrame( animationFrame );
    
    }
    
    render();

    //---

    introSpeed = Math.round( introSpeedBasis / scaleFactor );

    initIntroPath( introPathCoordinatesCount );
    stopIntro();
    playIntro();

}

//---

function initTextCanvas() {

    context.fillStyle = 'white';
    context.fillRect( 0, 0, w, h );
    context.fillStyle = 'black';

}

function drawTextToCanvas( { text, x, y, fontWeight, fontSize, color = 'black', align = 'center', baseline = 'middle' } ) {

    context.font = `${fontWeight} ${fontSize}px 'Open Sans', sans-serif`;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText( text, x, y );

}

function isPixelBlack( x, y ) {

    const imageData = context.getImageData( x, y, 1, 1 ).data;

    return imageData[ 0 ] === 0 && imageData[ 1 ] === 0 && imageData[ 2 ] === 0;

}

//---

function addDots() {

    const dotsPerRow = Math.ceil( Math.sqrt( dotsCount ) );

    const xs = Math.round( center.x - ( dotsPerRow * ( dotsDiameter + dotsDistance ) ) / 2 ) + dotsDiameter;
    const ys = Math.round( center.y - ( dotsPerRow * ( dotsDiameter + dotsDistance ) ) / 2 ) + dotsDiameter;

    for ( let i = 0; i < dotsCount; i++ ) {

        const x = xs + ( i % dotsPerRow ) * ( dotsDistance + dotsDiameter );
        const y = ys + Math.floor( i / dotsPerRow ) * ( dotsDistance + dotsDiameter );

        let dot = null;

        if ( isPixelBlack( x, y ) === true ) {

            dot = addDot( x, y, dotsRadius, dotsDiameter, 255, Math.floor( Math.random() * 255 ), 155, 255 );
            
        } else {

            dot = addDot( x, y, dotsRadius, dotsDiameter, Math.floor( Math.random() * 255 ), 0, 155, 255 );

        }

        dotsHolder.push( dot );

    }

}

function addDot( x, y, radius, diameter, r, g, b, a ) {

    const dot = {};

    dot.cx = x;
    dot.cy = y;
    dot.x = x;
    dot.y = y;
    dot.sx = 0;
    dot.sy = 0;
    dot.radius = radius;
    dot.minRadius = radius * 0.75;
    dot.maxRadius = radius * 2;
    dot.diameter = diameter;
    dot.color = {};
    dot.color.r = r;
    dot.color.g = g;
    dot.color.b = b;
    dot.color.a = a;
    dot.activeTime = 0;
    dot.distance = 0;
        
    return dot;

}

function removeDots() {

    if ( dotsHolder.length > 0 ) {

        dotsHolder = [];
    
    }

}

//---

function initIntroPath( numPoints ) {

    introPath = [];

    const radiusX = w / 4;
    const radiusY = h / 4;
    const centerX = w / 2;
    const centerY = h / 2;

    for ( let i = 0; i < numPoints; i++ ) {

        const angle = (i / numPoints) * 2 * Math.PI;
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY + radiusY * Math.sin(2 * angle) / 2;
        
        introPath.push({ x, y });

    }

}

function playIntro() {

    introInterval = setInterval( () => {

        const pos = introPath[ introIndex ];

        pointerPos = pos;

        introIndex++;

        if ( introIndex >= introPath.length - 1 ) {

            introIndex = 0;

        }

    }, introSpeed );

}

function stopIntro() {

    clearTimeout( pointerMoveTimeout );

    if ( introInterval !== null ) {

        clearInterval( introInterval );
        
        introInterval = null;

    }

}

//---

function cursorDownHandler( event ) {

    pointerDown = true;

}

function cursorUpHandler( event ) {

    pointerDown = false;

}

function cursorLeaveHandler( event ) {

    pointerPos = { x: -10000, y: -10000 };
    pointerDown = false;

}

function cursorMoveHandler( event ) {

    stopIntro();

    //---

    clearTimeout( pointerMoveTimeout );

    pointerMoveTimeout = setTimeout( () => {

        playIntro();

    }, pointerMoveTimeoutTime );

    //---

    pointerPos = getCursorPosition( canvas, event );

}

function getCursorPosition( element, event ) {

    const rect = element.getBoundingClientRect();
    const position = { x: 0, y: 0 };

    if ( event.type === 'mousemove' || event.type === 'pointermove' ) {

        position.x = event.pageX - rect.left; //event.clientX
        position.y = event.pageY - rect.top; //event.clientY

    } else if ( event.type === 'touchmove' ) {

        position.x = event.touches[ 0 ].pageX - rect.left;
        position.y = event.touches[ 0 ].pageY - rect.top;

    }

    return position;

}

//---

function clearImageData() {

    for ( let i = 0, l = data.length; i < l; i += 4 ) {

        data[ i ] = 0;
        data[ i + 1 ] = 0;
        data[ i + 2 ] = 0;
        data[ i + 3 ] = 0;

    }

}

function setPixel( x, y, r, g, b, a ) {

    const i = ( x + y * imageData.width ) * 4;

    data[ i ] = r;
    data[ i + 1 ] = g;
    data[ i + 2 ] = b;
    data[ i + 3 ] = a;

}

//---

function drawLine( x1, y1, x2, y2, r, g, b, a ) {

    const dx = Math.abs( x2 - x1 );
    const dy = Math.abs( y2 - y1 );

    const sx = ( x1 < x2 ) ? 1 : -1;
    const sy = ( y1 < y2 ) ? 1 : -1;

    let err = dx - dy;

    let lx = x1;
    let ly = y1;    

    while ( true ) {

        if ( lx > 0 && lx < w && ly > 0 && ly < h ) {

            setPixel( lx, ly, r, g, b, a );

        }

        if ( ( lx === x2 ) && ( ly === y2 ) ) {
        
            break;
        
        }

        const e2 = 2 * err;

        if ( e2 > -dx ) { 

            err -= dy; 
            lx += sx; 

        }

        if ( e2 < dy ) { 

            err += dx; 
            ly += sy; 

        }

    }

}

//---

function drawCircle( x, y, radius, r, g, b, a ) {

    if ( radius === 1 ) {

        if ( x > border.left && x < border.right && y > border.top && y < border.bottom ) {

            setPixel( x | 0, y | 0, r, g, b, a );

        }

        return;

    }

    const radiusSquared = radius * radius;

    for ( let x2d = x - radius; x2d < x + radius; x2d++ ) {

        for ( let y2d = y - radius; y2d < y + radius; y2d++ ) {

            const aa = x - x2d;
            const bb = y - y2d;

            const distanceSquared = aa * aa + bb * bb;

            if ( distanceSquared <= radiusSquared ) {

                if ( x2d > border.left && x2d < border.right && y2d > border.top && y2d < border.bottom ) {

                    setPixel( x2d | 0, y2d | 0, r, g, b, a  );

                }

            }

        }

    }

}

//---

function draw() {

    dotsMouseDistanceSensitivity = Math.min( dotsMouseDistanceSensitivityMax, Math.max( dotsMouseDistanceSensitivityMin, dotsMouseDistanceSensitivity + ( pointerDown ? dotsMouseDistanceSensitivitySpeed : -dotsMouseDistanceSensitivitySpeed ) ) );

    //---

    const l = dotsHolder.length;

    for ( let i = 0; i < l; i++ ) {

        const dot = dotsHolder[ i ];
        
        //---

        const a = pointerPos.x - dot.cx;
        const b = pointerPos.y - dot.cy;

        const dotActive = a * a + b * b <= dotsMouseDistanceSensitivity * dotsMouseDistanceSensitivity;

        if ( dotActive === true ) {

            const distX = pointerPos.x - dot.cx;
            const distY = pointerPos.y - dot.cy;

            dot.distance = Math.sqrt( distX * distX + distY * distY );

            //---

            const angle = Math.atan2( distY, distX );

            const dirX = Math.cos( angle ) * -1;
            const dirY = Math.sin( angle ) * -1;

            const targetPosX = dot.cx + dirX * dotsMaxEscapeRouteLength;
            const targetPosY = dot.cy + dirY * dotsMaxEscapeRouteLength;
            
            //---

            dot.x += ( targetPosX - dot.x ) / dotsSpeed;
            dot.y += ( targetPosY - dot.y ) / dotsSpeed;
            
            //---

            dot.activeTime = 1;

        } else {

            dot.distance = 0;

            dot.activeTime -= 0.01;

            //---
            
            if ( dot.activeTime > -2 ) {

                dot.sx = dot.sx * dotsWobbleFactor + ( dot.cx - dot.x ) * dotsWobbleSpeed;
                dot.sy = dot.sy * dotsWobbleFactor + ( dot.cy - dot.y ) * dotsWobbleSpeed;

                dot.x = Math.round( dot.x + dot.sx );
                dot.y = Math.round( dot.y + dot.sy );

            }

        }
    
        //---
        
        if ( dot.activeTime > 0 && dotsRadius >= 4 ) {

            drawCircle( dot.cx, dot.cy, dot.radius, Math.floor( dot.color.r / 2 ), Math.floor( dot.color.g / 2 ), Math.floor( dot.color.b / 2 ), Math.floor( dot.color.a / 2 ) );

        }

    }
    
    dotsHolder = dotsHolder.sort( ( a, b ) => {

        return ( a.distance - b.distance );

    } );

    for ( let i = 0; i < l; i++ ) {

        const dot = dotsHolder[ i ];

        if ( dot.activeTime > 0 ) {

            drawLine( dot.cx, dot.cy, dot.x | 0, dot.y | 0, dot.color.r, dot.color.g, dot.color.b, dot.color.a );

        }

    }
    
    for ( let i = 0; i < l; i++ ) {

        const dot = dotsHolder[ i ];

        let r; 
        let g;
        let b;

        let radius;

        if ( dot.distance === 0 ) {

            r = dot.color.r;
            g = dot.color.g;
            b = dot.color.b;

            radius = dot.radius;

        } else {

            const brightness = dot.distance / dotsMouseDistanceSensitivity;
            const clampedBrightness = Math.max( 0, Math.min( 1, brightness ) );
            const invertedBrightness = 1 - clampedBrightness;

            r = dot.color.r + ( 255 - dot.color.r ) * invertedBrightness;
            g = dot.color.g + ( 255 - dot.color.g ) * invertedBrightness;
            b = dot.color.b + ( 255 - dot.color.b ) * invertedBrightness;

            radius = dot.minRadius + ( dot.maxRadius - dot.minRadius ) * ( 1 - clampedBrightness );

        }

        drawCircle( dot.x, dot.y, radius, r, g, b, dot.color.a );

    }

}

//---

function render( timestamp ) {

    clearImageData();

    //---

    draw();

    //---

    context.putImageData( imageData, 0, 0 );
    
    //---

    animationFrame = requestAnimFrame( render );

}

window.requestAnimFrame = ( () => {

    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.msRequestAnimationFrame;

} )();

window.cancelAnimFrame = ( () => {

    return  window.cancelAnimationFrame       ||
            window.mozCancelAnimationFrame;

} )();

//---

document.addEventListener( 'DOMContentLoaded', () => {

    init();

} );
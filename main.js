window.onload = function(){

//GAME SPEED DEFINING PARAMETERS:
	var RADAR_VERTICAL_SPEED = 30, //changes the radar vertical sweep speed (degrees per second, def:38)
		RADAR_RANGE_SPEED = 350, //changes the speed of the range finder (pixels per second, def: 350)
		AIRPLANE_HORIZONTAL_SPEED = 150, //changes the speed of the airplanes (pixels per second, def: 200)
		gameWidth = 800,
		gameHeight = 500,
//DOM:
		canvas = document.createElement('canvas'),
		background = document.createElement('canvas'),
		gameDiv = document.getElementById('game'),
		pauseGame = document.getElementById("pauseGame"),
		scoreHolder = document.getElementById("score"),
		newGame = document.getElementById("newGame");
//INITIATE CANVAS PARAMETERS:
		background.setAttribute('width', gameWidth);
		background.setAttribute('height', gameHeight);
		gameDiv.appendChild(background);

		canvas.setAttribute('width', gameWidth);
		canvas.setAttribute('height', gameHeight);
		gameDiv.appendChild(canvas);



		var bgCtx = background.getContext('2d'),
		ctx = canvas.getContext('2d'),

		airplaneArray = [],
		cloudArray = [],
		running = false,
		score = 0,
		destructionTimer = 0, //used for the explosion effect
		lastFrame = 0, //used for the time based animation method
		currentFPS = 50, //used to store current FPS for the entire frame

		planeImage = new Image,    //Images From HERE:
		radarImage = new Image,
		whiteCloud = new Image,
		bombImage = new Image,
		bangImage = new Image,
		beamEnd = new Image,

								//Sounds From HERE:
		blastSound = new Audio('audio/blast.mp3'),
		successSound = new Audio('audio/success.mp3'),
		failureSound = new Audio('audio/failure.mp3'),

		bomb = '',                 // Animation Objects:
		bang = '',
		laserBeam = '';

		planeImage.src = 'images/plane.png';
		radarImage.src = 'images/radar.png';
		whiteCloud.src = 'images/whiteCloudStroke.png';
		bombImage.src = 'images/bomb.png';
		bangImage.src = 'images/bang.png';
		beamEnd.src = 'images/beamEnd.png';




	//CONSTRUCTORS
	//FOLLOW:

	//radar constructor
	var Radar = (function(){

		function Radar(positionX, positionY){
			this.x = positionX;
			this.y = positionY;
			this.angle = 2;
			this.increase = true;
			//becomes true upon successfull lock on
			this.angleLock = '';
			//becomes false upon unsuccessfull lockon
			this.active = true;
			this.range = 2;
		}


		//Draw radar ray method -> angle + range indicator
		Radar.prototype.radarRayDraw = function(){
			var endX = this.x + canvas.width;
			var endY = this.y - (endX - this.x) * Math.tan(toRad(this.angle));
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(this.x, this.y);
			ctx.lineTo(endX - 10, endY - 10);
			ctx.lineTo(endX + 10, endY + 10);
			ctx.lineTo(this.x, this.y);
			ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
			ctx.fill();
			ctx.closePath();
			ctx.restore();

			//draws the range indicator
			if (this.angleLock !='') {
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.range + 2, toRad(360 - this.angle - 2), toRad(360 - this.angle +2));
				ctx.arc(this.x, this.y, this.range, toRad(360 - this.angle - 3), toRad(360 - this.angle +3));
				ctx.arc(this.x, this.y, this.range - 2, toRad(360 - this.angle - 2), toRad(360 - this.angle +2));
				ctx.stroke();
			}
		}

			//Update ray angle method

		Radar.prototype.updateAngle = function(fps){
			//time based vertical speed

			var step = RADAR_VERTICAL_SPEED / fps;

			if (this.angleLock =='') {
				if (this.increase) {
					if (this.angle < 50) {
						this.angle += step;
					}
					else {
						this.increase = false;
					}
				}
				else{
					if (this.angle > 0) {
						this.angle -= step;
					}
					else{
						this.increase = true;
					}
				}
			}
			else{
				// This is the angle to the locked target:
				this.angle = toDeg(Math.atan((this.y - this.angleLock.y) / (this.angleLock.x - this.x)))
			}
		}

			//Updates the range parameter when angle lock on is aquired
			//Default step is 1
		Radar.prototype.updateRange = function(fps){
			var step = RADAR_RANGE_SPEED / fps;


			if(step == undefined){step = 1}
			if (this.angleLock !='') {
				this.range += step;
			}
		}

			//Drawing the radar on its initial position
		Radar.prototype.radarDraw = function(){

			bgCtx.drawImage(radarImage, this.x - 30, this.y - 30);
			//bgCtx.fillRect(40, 40, this.x - 30, this.y - 20);
		}
		return Radar;
	}());

	//Airplane constructor

	var Airplane = (function(){

		function Airplane(horizontalSpeed, flightLevel){
			this.x = canvas.width + 20;
			this.y = flightLevel;
			this.speed = horizontalSpeed;
			this.lockOn = false;
			this.radius = 25;
			this.firedAt = false;
		}

		//Drawing of the airplane
		//TO BE replaced with sprites
		Airplane.prototype.airplaneDraw  = function(){
			ctx.save();
			ctx.drawImage(planeImage, this.x - 30, this.y - 30);
			// LockOn annimation follows
			if (this.lockOn) {
				ctx.beginPath();
				ctx.moveTo(this.x - this.radius - 5, this.y - this.radius + 5);
				ctx.lineTo(this.x - this.radius - 5, this.y - this.radius - 5);
				ctx.lineTo(this.x - this.radius + 5, this.y - this.radius - 5);
				ctx.moveTo(this.x + this.radius - 5, this.y - this.radius - 5);
				ctx.lineTo(this.x + this.radius + 5, this.y - this.radius - 5);
				ctx.lineTo(this.x + this.radius +5 , this.y - this.radius + 5);
				ctx.moveTo(this.x + this.radius + 5, this.y + this.radius - 5);
				ctx.lineTo(this.x + this.radius + 5, this.y + this.radius + 5);
				ctx.lineTo(this.x + this.radius - 5 , this.y + this.radius + 5);
				ctx.moveTo(this.x - this.radius + 5, this.y + this.radius + 5);
				ctx.lineTo(this.x - this.radius - 5, this.y + this.radius + 5);
				ctx.lineTo(this.x - this.radius - 5 , this.y + this.radius - 5);
				//ctx.closePath();
				ctx.stroke();
			};
		}



		//updates the position
		Airplane.prototype.updatePosition = function(fps){
			var step = this.speed / fps;


			this.x -= step;
			if(this.x <= myRadar.x && !this.lockOn){
				if(bomb == ''){
					bomb = new Bomb(myRadar.x, this.y, myRadar.y);
				}
			}
		}
		return Airplane;
	}());

	//Bomb constructor:
	var Bomb = (function(){
		function Bomb(x, y, target){
			this.x = x;
			this.y = y;
			this.targetY = target;
		}

		Bomb.prototype.drawBomb = function(){
			if(this.y >= this.targetY){
				if(bang==''){
					bang = new Bang(this.x, this.y, 100, true);
				}
				//ctx.drawImage(bangImage, 0, 0, 400, 400, this.x - 100, this.y - 100, 200 , 200);
			}else{
				ctx.drawImage(bombImage, 0, 0, bombImage.width, bombImage.height, this.x, this.y, (this.y/this.targetY)*16 , (this.y/this.targetY)*39);
				this.y +=5;
			}
		}
		return Bomb;
	}());

	//Laser Beam constructor:
	var LaserBeam = (function(){

		function LaserBeam(x, y){
			this.x = x;
			this.y = y;
		}

		LaserBeam.prototype.drawBeam= function(){
			ctx.save();
			ctx.strokeStyle = '#f00';
			ctx.strokeWidth = 2;
			ctx.beginPath();
			ctx.moveTo(myRadar.x, myRadar.y);
			ctx.lineTo(this.x, this.y);
			ctx.stroke();

			ctx.restore();
			ctx.drawImage(beamEnd, this.x - (beamEnd.width / 2), this.y- (beamEnd.height / 2));
		}
		return LaserBeam;
	}());


	//bang constructor:
	var Bang = (function(){

		function Bang(x, y, size, radarBang){
			this.x = x;
			this.y = y,
			this.size = size;
			this.timer = 5;
			this.radarBang = radarBang;
		}

		Bang.prototype.drawBang = function(){
			//blastSound.play();
			ctx.drawImage(bangImage, 0, 0, bangImage.width, bangImage.height, this.x - this.timer, this.y - this.timer, this.timer*2 , this.timer*2);
			if(this.timer < this.size){
				this.timer +=5;
			}
			else{
				if(this.radarBang){
					resetGame();
				}
				else{
					bang='';
				}
			}

		}
		return Bang;
	}());

	//Cloud constructor:
	var Cloud = (function(){
		function Cloud(speed, position){
			this.x = position;
			this.y = randomInt(0, 150);
			this.speed = speed;
			this.cloudType = randomInt(0,12);
			this.size = {
				w: randomInt(100,250),
				h: randomInt(50, 150)
			}
		}

		Cloud.prototype.cloudDraw = function(){
			//If cloud sheet is used:
			//ctx.drawImage(cloudSheet, this.cloudType * 150, 0, 150, 100, this.x, this.y, 250, 150);
			//Just 1 cloud:
			ctx.drawImage(whiteCloud, 0, 0, whiteCloud.width, whiteCloud.height, this.x, this.y, this.size.w , this.size.h);
		}
		Cloud.prototype.update = function(){
			this.x += this.speed;
		}
		return Cloud;
	}());


	//***************
	//ARRAY FUNCTIONS
	//***************

	//AIRPLANE ARRAY FUNCTIONS:
	//draws every plane from the plane array
	function airplaneArrayDraw(array){
		var i = array.length - 1;
		for (i; i >= 0; i--) {
			array[i].airplaneDraw();
		};
	}
	//Updates the position of every plane
	function airplaneArrayUpdate(array, fps){

		var i = array.length - 1;
		for (i; i >= 0; i--) {

			//in case of missile fired:
			if (array[i].lockOn) {
				destructionTimer++;
				if(laserBeam =='' && destructionTimer > 10){
					laserBeam = new LaserBeam(array[i].x, array[i].y);
				}
				else {
					laserBeam.x = array[i].x;
					laserBeam.y = array[i].y;
				}
				if (destructionTimer > 20){
					bang = new Bang(array[i].x, array[i].y, 50, false);
					score++;
					array.splice(i, 1);
					array.push(new Airplane(AIRPLANE_HORIZONTAL_SPEED, randomInt(20, canvas.height - 200)));
					myRadar.range = 2;
					destructionTimer = 0;
					laserBeam = '';
				};
			}
			array[i].updatePosition(fps);
		};
	}

	//CLOUDS ARRAY FUNCTIONS
	//Draw all clouds + update cloud position + remove out of view clouds+
	// create new clouds
	function cloudsArrayDraw(array){
		var j = array.length - 1;
		for (j; j >= 0; j--) {
			array[j].cloudDraw();
			array[j].update();
			if (array[j].x > canvas.width){
				array.splice(j, 1);
				array.push(new Cloud(0.2, -250));
			}
		};
	}


	//EVENT LISTENERS:

	//Pause the game
	//Dedicated button
	pauseGame.addEventListener('mousedown', function(){
		if (running) {
			running = false;
		}
		else {
			running = true;
			frame();
		}
	});

	//Restarts the game
	newGame.addEventListener('click', function(){
		resetGame();
	});

	//Make lockon check
	//Canvas mousedown or screen touch

	canvas.addEventListener('mousedown', function(){
		//check if the radar is active:
		if(!myRadar.active){
			return;
		}

		//starts a game if it was paused
		if (!running) {
			running = true;
			frame();
			return;
		};
		//angle lock check + range lock check:
		if(myRadar.angleLock == ''){
			var i = airplaneArray.length - 1;
			for (i; i >= 0; i--) {
				if (myRadar.angle < angleToTarget(myRadar, airplaneArray[i] ) + 1.5 &&
					myRadar.angle > angleToTarget(myRadar, airplaneArray[i] ) - 1.5) {
					myRadar.angleLock = airplaneArray[i];
					successSound.play();
					//airplaneArray[i].lockOn = true;
				}
				else{
					failureSound.play();
					myRadar.active = false;
					setTimeout(myRadar.active = true, 2000);
				}
			};


		}
		else {
			if (myRadar.range > distanceToTarget(myRadar, myRadar.angleLock) - myRadar.angleLock.radius &&
				myRadar.range < distanceToTarget(myRadar, myRadar.angleLock) + myRadar.angleLock.radius) {
				myRadar.angleLock.lockOn = true;
				myRadar.angleLock = '';
				successSound.play();
			}
			else {
				myRadar.angleLock = '';
				myRadar.range = 2;
				failureSound.play();
			}
		}
	});

	//animation frame
	function frame(){
		currentFPS = calculateFps().toFixed(); //current fps holder
		if (currentFPS< 30 || currentFPS > 60){
			currentFPS = 50
		}
		ctx.clearRect(0,0, canvas.width, canvas.height);
		airplaneArrayDraw(airplaneArray);

		//Draw bomb if any:
		if(bomb!=''){
			bomb.drawBomb();
		}
		//myRadar.radarDraw();
		if(bang.radarBang != true){
			myRadar.radarRayDraw();
		}


		//Draw bang if any:
		if(bang!=''){
			bang.drawBang();
		}

		//Draw beam if any:
		if(laserBeam!=''){
			laserBeam.drawBeam();
		}

		//Test cloud
		cloudsArrayDraw(cloudArray);

		myRadar.updateAngle(currentFPS);
		myRadar.updateRange(currentFPS);
		scoreHolder.innerHTML = score;
		airplaneArrayUpdate(airplaneArray, currentFPS);

		//displays current fps
		ctx.fillStyle = 'red';
		ctx.fillText(currentFPS + ' fps', canvas.width - 60, 60);
		//animate
		if (running) {
			window.requestAnimationFrame(frame);
		}
	}

	//Restarts the game
	function resetGame(){
		running = false;
		alert("GAME OVER! YOUR SCORE IS " + score);
		score = 0;
		bomb = '';
		bang = '';
		airplaneArray.splice(0, 10);
		airplaneArray.push(new Airplane(AIRPLANE_HORIZONTAL_SPEED, randomInt(20, canvas.height - 200)));
		myRadar.angle = 2;
		myRadar.increase = true;
		myRadar.angleLock = '';
		myRadar.range = 3;
		frame();
	}


	// Distance to airplane
	function distanceToTarget(radar, target){
		var cat1 = Math.abs(target.x - radar.x);
		var cat2 = Math.abs(radar.y - target.y);
		return Math.sqrt(cat1 * cat1 + cat2 * cat2);
	}

	//calculates reverse angle from the target
	function angleToTarget(radar, target){
		return toDeg(Math.atan((radar.y - target.y) / (target.x - radar.x)));
	}

	//converts degrees to radians
	function toRad(degrees){
		return 3.14/180 * degrees;
	}

	//converts radians to degrees
	function toDeg(radians){
		return 180/3.14 * radians;
	}

	//creates random integer between lower and upper boundaries (INCLUSIVE)
	function randomInt(lower, upper){
		return Math.round((Math.random() * (upper - lower)) + lower);
	}

	//Calculates current fps
	function calculateFps() {
		var now = (+new Date),
		fps = 1000 / (now - lastFrame);
		lastFrame = now;
		return fps;
	}

	//test draw function
	function testDraw(inputObject){
		ctx.beginPath();
		ctx.arc(inputObject.x, inputObject.y, 10, 0, 2*Math.PI);
		ctx.fill();
	}



	var myRadar = new Radar(50, 400);

	//PERMANENT BACKGROUND SECTION:
	radarImage.onload = function(){myRadar.radarDraw();}
	bgCtx.fillStyle = '#ceffff';
	bgCtx.fillRect(0, 0, canvas.width, canvas.height);
	bgCtx.fillStyle = '#ecf77f';
	bgCtx.fillRect(0, canvas.height - 100, canvas.width, canvas.height - 100);
	bgCtx.fillStyle = 'yellow';
	bgCtx.arc(100, 55, 30, 0, 2*Math.PI);
	bgCtx.fill();

	//Initial clouds:
	var count = 4;
	for (count; count >= 0; count--) {
		cloudArray.push(new Cloud(0.2, randomInt(0, canvas.width)));
	};
	airplaneArray.push(new Airplane(AIRPLANE_HORIZONTAL_SPEED, randomInt(20, canvas.height - 200)));
	//airplaneArray.push(new Airplane(4, 250));
	//myRadar.radarRayDraw();

	window.requestAnimationFrame(frame);
}

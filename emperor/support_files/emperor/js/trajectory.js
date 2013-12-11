/**
 *
 * @author Yoshiki Vazquez Baeza
 * @copyright Copyright 2013, Emperor
 * @credits Yoshiki Vazquez Baeza
 * @license BSD
 * @version 0.9.2-dev
 * @maintainer Yoshiki Vazquez Baeza
 * @email yoshiki89@gmail.com
 * @status Development
 *
 */


/**
 *
 *
 */
function TrajectoryOfSamples(sampleNames, gradientPoints, coordinates, minimumDelta, suppliedN){
	this.sampleNames = sampleNames;

	// array of the values that samples have through the gradient
	this.gradientPoints = gradientPoints;

	// the first three axes of the data points
	this.coordinates = coordinates;

	// minimum distance in the gradient
	this.minimumDelta = minimumDelta;

	// the default supplied N will last "ideally" a couple seconds, that is
	// if the frames per second is running at at least 30
	this.suppliedN = suppliedN !== undefined ? suppliedN : 5;

	if (this.coordinates.length != this.gradientPoints.length) {
		console.log("That's a bold move Cotton, let's see if it pays off");
	}

	// initialize as an empty array but fill it up upon request
	this.interpolatedCoordinates = null;

	// will this even work?
	this._generateInterpolatedCoordinates();
}

/**
 *
 *
 */
TrajectoryOfSamples.prototype._generateInterpolatedCoordinates = function(){
	var pointsPerStep = 0, delta = 0;
	var interpolatedCoordinatesBuffer = new Array();

	// iterate over the deltas in the category
	for (var index = 0; index < this.gradientPoints.length-1; index++){
		// console.log('Generating point '+index);
		// calculate the absolute difference of the current pair of points
		delta = Math.abs(Math.abs(this.gradientPoints[index])-Math.abs(this.gradientPoints[index+1]));

		pointsPerStep = calculateNumberOfPointsForDelta(delta, this.suppliedN, this.minimumDelta);

		interpolatedCoordinatesBuffer = _.union(interpolatedCoordinatesBuffer,
							linearInterpolation(this.coordinates[index]['x'],
												this.coordinates[index]['y'],
												this.coordinates[index]['z'],
												this.coordinates[index+1]['x'],
												this.coordinates[index+1]['y'],
												this.coordinates[index+1]['z'],
												pointsPerStep)
				);

		// console.log('This section had these many points '+this.interpolatedCoordinates.length)
		// for (var point = 0; point < pointsPerStep; point++){
		// 	this.interpolatedCoordinates.push(/*insert the freaking magic in here; I'm ready just do it*/)
		// }
	}

	this.interpolatedCoordinates = interpolatedCoordinatesBuffer;
}

/**
 *
 *
 */
function calculateNumberOfPointsForDelta(delta, suppliedN, minimumDelta) {
	return Math.floor((delta*suppliedN)/minimumDelta);
}

/**
 *
 *
 * very heavily based on the code found on:
 *     http://snipplr.com/view.php?codeview&id=47206
 */
function linearInterpolation( x_1, y_1, z_1, x_2, y_2, z_2, steps){
	var xAbs = Math.abs(x_1-x_2);
	var yAbs = Math.abs(y_1-y_2);
	var zAbs = Math.abs(z_1-z_2);
	var xDiff = x_2-x_1;
	var yDiff = y_2-y_1;
	var zDiff = z_2-z_1

	// and apparetnly this makes takes no effect whatsoever
	var length = Math.sqrt(xAbs*xAbs + yAbs*yAbs + zAbs*zAbs);
	var xStep = xDiff/steps;
	var yStep = yDiff/steps;
	var zStep = zDiff/steps;

	var newx = 0;
	var newy = 0;
	var newz = 0;
	var result = new Array();

	for( var s = 0; s < steps; s++ ){
		newx = x_1+(xStep*s);
		newy = y_1+(yStep*s);
		newz = z_1+(zStep*s);

		result.push({'x': newx, 'y': newy, 'z': newz});
	}

	return result;
}

/**
 *
 *
 * very heavily based on the code found on: 
 *     http://snipplr.com/view.php?codeview&id=47207
 */
function distanceBetweenPoints( x_1, y_1, z_1, x_2, y_2, z_2){
	var xs = 0;
	var ys = 0;
	var zs = 0;

	// Math.pow is faster than simple multiplication
	xs = Math.pow(Math.abs(x_2-x_1), 2);
	ys = Math.pow(Math.abs(y_2-y_1), 2);
	zs = Math.pow(Math.abs(z_2-z_1), 2)

	return Math.sqrt(xs+ys+zs);
}

/**
 *
 *
 */
function getSampleNamesAndDataForSortedTrajectories(mappingFileHeaders, mappingFileData, coordinatesData, trajectoryCategory, gradientCategory){
	console.log('start get samples');
	var gradientIndex = mappingFileHeaders.indexOf(gradientCategory);
	var trajectoryIndex = mappingFileHeaders.indexOf(trajectoryCategory);

	var chewedSampleData = new Object();
	var trajectoryBuffer = null, gradientBuffer = null;

	// this is the most utterly annoying thing ever
	if (gradientIndex === -1) {
		throw new Error("Gradient category not found in mapping file header");
	}
	if (trajectoryIndex === -1) {
		throw new Error("Trajectory category not found in mapping file header");
	}

	for (var sampleId in mappingFileData){
		// console.log('The value of the SampleId is '+sampleId);

		trajectoryBuffer = mappingFileData[sampleId][trajectoryIndex];
		gradientBuffer = mappingFileData[sampleId][gradientIndex];

		// console.log('Value of chewedSampleData'+chewedSampleData);
		// console.log(chewedSampleData);

		// check if there's already an element for this trajectory
		if (chewedSampleData[trajectoryBuffer] === undefined){
			// console.log('initializing the array');
			chewedSampleData[trajectoryBuffer] = new Array();
		}
		chewedSampleData[trajectoryBuffer].push({'name': sampleId,
			'value': gradientBuffer, 'x': coordinatesData[sampleId]['x'],
			'y': coordinatesData[sampleId]['y'], 'z': coordinatesData[sampleId]['z']});
	}

	// we need this custom sorting function to make the values be sorted in
	// ascending order but accounting for the data structure that we just built
	var sortingFunction = function (a, b){return parseFloat(a["value"]) - parseFloat(b["value"]);}

	for (var key in chewedSampleData){
		// console.log('The value of the key is '+key);
		chewedSampleData[key].sort(sortingFunction);
	}
	console.log('finish get samples');
	return chewedSampleData;
}

/**
 *
 *
 */
function getMinimumDelta(sampleData){
	if (sampleData === undefined){
		throw new Error("The sample data cannot be undefined");
	}

	var bufferArray = new Array(), deltasArray = new Array();

	for (var key in sampleData){
		// console.log('The value of the key is: '+key);
		// console.log('The length of the array is: '+sampleData[key].length);
		for (var index = 0; index < sampleData[key].length; index++){
			bufferArray.push(sampleData[key][index]['value']);
		}
		for (var index = 0; index < bufferArray.length-1; index++){
			deltasArray.push(Math.abs(bufferArray[index+1]-bufferArray[index]));
		}
		// clean buffer array
		bufferArray.length = 0;
	}

	// if (deltasArray == null){
	// 	throw new Error("Could not find records to compute minimum delta");
	// }

	deltasArray = _.filter(deltasArray, function(num){ return num !== 0; });

	return _.min(deltasArray);
}

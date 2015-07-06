util = {

	softIndexOf: function (value, array, equality) {
		for (var i = 0; i < array.length; i ++) {
			if (equality(value, array[i])) {
				return i
			}
		}
		return -1
	}

}

function Vec2(x, y) {
	this.x = x
	this.y = y
}

Vec2.prototype.add = function(v2) {
	return new Vec2(this.x + v2.x, this.y + v2.y)
}

Vec2.prototype.sub = function(v2) {
	return new Vec2(this.x - v2.x, this.y - v2.y)
}

Vec2.prototype.scale = function(k) {
	return new Vec2(k*this.x, k*this.y)
}

Vec2.prototype.dot = function(v2) {
	return (this.x*v2.x + this.y*v2.y)
}

Vec2.prototype.angle = function(v2) {
	return Math.acos((this.dot(v2)) / (this.mag() * v2.mag()))
}

Vec2.prototype.project = function(v2) {
	return v2.scale(this.dot(v2) / v2.dot(v2))
}

Vec2.prototype.rot = function(angle) {
	var c = Math.cos(angle)
	var s = Math.sin(angle)
	return new Vec2(c*this.x - s*this.y, s*this.x + c*this.y)
}

Vec2.prototype.rot90CCW = function() {
	return new Vec2(-this.y, this.x)
}

Vec2.prototype.rot90CW = function() {
	return new Vec2(this.y, -this.x)
}

Vec2.prototype.mag = function() {
	return Math.sqrt(this.x*this.x + this.y*this.y)
}

Vec2.prototype.unit = function() {
	var m = this.mag()
	return new Vec2(this.x / m, this.y / m)
}

function V(x, y) {
	return new Vec2(x, y)
}
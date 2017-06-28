window.UIUtil = {};

UIUtil.getPageOffset = function(obj) {
	// gets the cumulative offset coordinates for a node
    var left, top;
    left = top = 0;
    if (obj.offsetParent) {
        do {
            left += obj.offsetLeft;
            top  += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }
    return {
        x : left,
        y : top
    };	
};
UIUtil.getWindowOffset = function(node) {
	// gets the window offset coordinates for a node
	
	var doc = document.documentElement, body = document.body;
	var left = (doc && doc.scrollLeft || body && body.scrollLeft || 0);
	var top = (doc && doc.scrollTop  || body && body.scrollTop  || 0);
	
	var coords = UIUtil.getPageOffset(node);
	coords.x -= left;
	coords.y -= top;
	
	return coords;
};
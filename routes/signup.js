exports.view = function(req, res) {
	var data = {'auth':  false};
	res.render('signup', data);
}
exports.view = function(req, res) {
	console.log(req.user);
	res.render('index', {user: req.user});
}
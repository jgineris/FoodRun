exports.view = function(req, res) {
	console.log(req.user);
	res.render('account', {user: req.user});
}
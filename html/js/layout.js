(function($){
	var initLayout = function() {
		return $('#colorpickerHolder').ColorPicker({flat: true});
	};

	EYE.register(initLayout, 'init');
})(jQuery);
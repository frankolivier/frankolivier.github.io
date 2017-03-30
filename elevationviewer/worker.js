self.addEventListener('message', function(e) {

  // let's fake doing a lot of worker

  var x = "";
  for (var i = 0; i < 4999999; i++)
  {
	  x += i;
  }

  self.postMessage(e.data + ' this is worker string' + x.length);
}, false);
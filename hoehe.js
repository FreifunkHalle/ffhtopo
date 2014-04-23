function setsize()
		{
                        var tmp = hoehe();
                        document.getElementById("content").style.height=(tmp-6).toString()+"px";
                        document.getElementById("map").style.height=(tmp-10).toString()+"px";
                        document.getElementById("sidebar").style.height=(tmp-8).toString()+"px";
		}
function lade()
		{
			setsize();
			mtLoad(mtConfig);
		}
function hoehe()
		{
			return document.documentElement.clientHeight
                            -document.getElementById("menubar").clientHeight
                            -document.getElementById("header").clientHeight
                            -document.getElementById("footer").clientHeight;
		}
function breite()
		{
			return  Math.round(document.documentElement.clientWidth*0.8-2-201);
		}

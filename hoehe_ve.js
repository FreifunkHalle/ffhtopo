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
			document.getElementById("map").style.width="initial";
		}
                
function hoehe()
		{
			return document.documentElement.clientHeight
                            -document.getElementById("menubar").clientHeight
                            -document.getElementById("footer").clientHeight
                            -document.getElementById("header").clientHeight;
		}

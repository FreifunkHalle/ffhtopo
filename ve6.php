
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>FFHTopo - Freifunk Halle</title>

<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<script type="text/javascript">
mtConfig = {
	maplayer: 'map',
	menulayer: 'menubar',
	mapapi: 've6',
        latitude: 51.47727,
        longitude: 11.95667,
	zoomlevel: 12,
	server: '/Tools/JSON.ashx',
	sidebar: 'sidebar',
	gclocale: ', Halle (Saale), Deutschland',
	helplayer: 'helpbar'
}
</script>
<script type="text/javascript" src="hoehe_ve.js"></script>
<script type="text/javascript" src="ffhtopo/mtutils.js"></script>
<script type="text/javascript" src="ffhtopo/natcompare.js"></script>
<script type="text/javascript" src="ffhtopo/mtmap-ve6.js"></script>
<script type="text/javascript" src="ffhtopo/mtwidgets.js"></script>
<script type="text/javascript" src="ffhtopo/mtengine.js"></script>
<script type="text/javascript" src="ffhtopo/mtcontext-hna.js"></script>
<script type="text/javascript" src="ffhtopo/mtcontext-topography.js"></script>
<script type="text/javascript" src="http://ecn.dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=6.2"></script>
</head>
<body onload="lade()" onresize="setsize()" >

	<div id="menubar" >
		<div id="helpbar"><a href="index.php">Google Maps Ansicht</a> - <a href="osm.php">OpenStreetMap Ansicht</a> - </div>
	</div>
	<div id="content" >
		<div id="sidebar" ></div>
		<div id="map" style="position:relative;"></div>
	</div>

</body>
</html>


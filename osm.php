
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<title>FFHTopo - Freifunk Halle</title>

<script type="text/javascript">
mtConfig = {
	maplayer: 'map',
	menulayer: 'menubar',
	mapapi: 'osm',
	latitude: 51.47727,
	longitude: 11.95667,
	zoomlevel: 12,
	server: '/Tools/JSON.ashx',
	sidebar: 'sidebar',
	gclocale: ', Halle, Deutschland',
	helplayer: 'helpbar'
}
</script>

<script type="text/javascript" src="hoehe.js"></script>	
<script type="text/javascript" src="ffhtopo/mtutils.js"></script>
<script type="text/javascript" src="ffhtopo/natcompare.js"></script>
<script type="text/javascript" src="ffhtopo/mtmap-osm.js"></script>
<script type="text/javascript" src="ffhtopo/mtwidgets.js"></script>
<script type="text/javascript" src="ffhtopo/mtengine.js"></script>
<script type="text/javascript" src="ffhtopo/mtcontext-hna.js"></script>
<script type="text/javascript" src="ffhtopo/mtcontext-topography.js"></script>
<script type="text/javascript" src="//www.openlayers.org/api/OpenLayers.js"></script>
<script type="text/javascript" src="//www.openstreetmap.org/openlayers/OpenStreetMap.js"></script>
</head>
<body onload="lade()" onresize="setsize()">

	
	<div id="menubar">
		<div id="helpbar"><a href="index.php">Google Maps Ansicht</a> - <a href="ve6.php">Virtual Earth Ansicht</a> - </div>
	</div>
	<div id="content">
		<div id="sidebar"></div>
		<div id="map"></div>
	</div>

</body>
</html>

$(document).ready(function () {
	$.getJSON("config/urls.json")
		.done(function (json) {
      url = json.urls;
			$.post(url.OD_totals + "/query", {
        where: "1=1",
        outFields: "Direction",
        returnGeometry: false,
        orderByFields: 'Direction',
        returnDistinctValues: true,
        f: 'pjson'
      })
      .done(function (data) {
        var directions = $.parseJSON(data);
        $(directions.features).each(function () {
          $('#directionSelect').append(
            $('<option></option>').val(this.attributes.Direction).html(this.attributes.Direction)
          );
        });
      });
			$.post(url.corridors + "/query", {
				where: "1=1",
				outFields: "SubSegment, Route_ID",
				returnGeometry: false,
				orderByFields: 'Route_ID',
				returnDistinctValues: true,
				f: 'pjson'
			})
			.done(function (data) {
				var subCorridors = $.parseJSON(data);
				$(subCorridors.features).each(function () {
					var corridor = this.attributes.Route_ID.match(/[a-zA-Z]+|[0-9]+/g);
					$('#subCorrSelect').append(
						$('<option></option>').val(this.attributes.SubSegment).html(corridor[0] + '-' + corridor[1] + ': ' + this.attributes.SubSegment)
					);
				});
			});
		})
    .fail(function (jqxhr, textStatus, error) {
      var err = textStatus + ", " + error;
    });

		$("#togglePopupBtn").click(function() {
			if($("#togglePopupBtn").children(".close").css("display")=="block") {
				console.log("Closing...");
				$("#togglePopupBtn").children(".close").css("display", "none");
				$("#togglePopupBtn").children(".open").css("display", "block");
				$("#viewDiv").css("height", "96.3%");
				$("#togglePopupBtn").css("height", "100%");
				$("#popupModalRow").css("display", "none");
				$("#popupModal").css("height", "3.7%");
			} else {
				console.log("Re-opening...");
				$("#togglePopupBtn").children(".close").css("display", "block");
				$("#togglePopupBtn").children(".open").css("display", "none");
				$("#viewDiv").css("height", "63%");
				$("#togglePopupBtn").css("height", "10%");
				$("#popupModalRow").css("display", "block");
				$("#popupModal").css("height", "37%");
			}
		})

		$("#helpContent").on("click", "button", function() {
			$("#helpModal").css('display', 'none');
		});

		$("#helpBtn").on("click", function() {
			$("#helpModal").css('display', 'block');
		})

});

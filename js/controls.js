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

		$("#closePopup-btn").click(function() {
		  $("#projectModal").css("display", "none");
			$("#closePopup-btn").css("display", "none");
		  $("#viewDiv").css("height", "96%");
			$("#reopenPopup-btn").css("display", "block");
			$("#reopenPopup-btn").css("height", "4%");
		})

		$("#reopenPopup-btn").click(function() {
			$("#projectModal").css("display", "block");
			$("#viewDiv").css("height", "59%");
			$("#projectModal").css("height", "37%");
			$("#closePopup-btn").css("display", "block");
			$("#reopenPopup-btn").css("display", "none");
		})

		$("#helpContent").on("click", "button", function() {
			$("#helpModal").css('display', 'none');
		});

		$("#helpBtn").on("click", function() {
			$("#helpModal").css('display', 'block');
		})

});

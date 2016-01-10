$(document).ready(function () {

    var login = $('#loginform');
    var recover = $('#recoverform');
    var scenc = document.documentElement.clientHeight;
    var boxHieght = document.getElementById("loginbox").clientWidth;
    if (boxHieght > scenc) {
        document.getElementById('loginbox').style.marginTop = "0px";
    }
    if (boxHieght < scenc) {
        document.getElementById('loginbox').style.marginTop = (scenc - boxHieght) / 2 + "px";
    }
    var speed = 400;

    $('#to-recover').click(function () {

        $("#loginform").slideUp();
        $("#recoverform").fadeIn();
    });
    $('#to-login').click(function () {

        $("#recoverform").hide();
        $("#loginform").fadeIn();
    });


    $('#to-login').click(function () {

    });

    //if ($.browser.msie == true && $.browser.version.slice(0, 3) < 10) {
    //    $('input[placeholder]').each(function () {

    //        var input = $(this);

    //        $(input).val(input.attr('placeholder'));

    //        $(input).focus(function () {
    //            if (input.val() == input.attr('placeholder')) {
    //                input.val('');
    //            }
    //        });

    //        $(input).blur(function () {
    //            if (input.val() == '' || input.val() == input.attr('placeholder')) {
    //                input.val(input.attr('placeholder'));
    //            }
    //        });
    //    });



    //}
});
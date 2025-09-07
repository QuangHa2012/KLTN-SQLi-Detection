document.addEventListener("DOMContentLoaded", function () {
    // ==== Validate Register ====
    const formRegister = document.getElementById("form-dk");
    if (formRegister) {
        const passwordInput = document.getElementById("auth-form__input--password");
        const confirmInput = document.getElementById("auth-form__input--confirmpassword");
        const errorSpan = document.getElementById("tbchung");

        formRegister.addEventListener("submit", function (e) {
            errorSpan.textContent = "";

            if (passwordInput.value !== confirmInput.value) {
                e.preventDefault();
                errorSpan.textContent = "Mật khẩu nhập lại không khớp!";
                confirmInput.focus();
            }
        });
    }

    // ==== Validate Login ====
    const formLogin = document.querySelector("#auth-form-login form");
    if (formLogin) {
        const emailInput = document.getElementById("auth-form__input--email");
        const passwordInput = document.getElementById("auth-form__input--password");
        const errorSpanLogin = document.querySelector("#auth-form-login #tbchung");

        formLogin.addEventListener("submit", function (e) {
            errorSpanLogin.textContent = "";

            if (!emailInput.value.trim() || !passwordInput.value.trim()) {
                e.preventDefault();
                errorSpanLogin.textContent = "Vui lòng nhập đầy đủ email và mật khẩu!";
                emailInput.focus();
            }
        });
    }
});

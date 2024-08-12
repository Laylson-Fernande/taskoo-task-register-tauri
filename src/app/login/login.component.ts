import { Component } from '@angular/core';
import { AuthService } from 'src/services/authentication/auth.service';
import { AppSettings } from 'src/utils/app.settings';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from 'src/services/app/notification.service';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  loginForm!: FormGroup;

  constructor(private authService: AuthService, private formBuilder: FormBuilder, private appSettings: AppSettings,
    private notificationService: NotificationService, private router: Router) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      agreeTerms: ['', Validators.required],
      saveCredentions: ''
    });
    //this.login();
  }

  async login(event: Event) {
    const formValues = this.loginForm.value;

    const cPassword = CryptoJS.AES.encrypt(formValues.password, this.appSettings.passHash).toString();
    const isAuthenticated = await this.loginOrbit(formValues.email, cPassword);
    //const isAuthenticated = await this.loginOrbit(this.appSettings.user_email, this.appSettings.user_password);
    if (isAuthenticated) {
      await this.appSettings.saveUserOrbitCredentials(formValues.email, cPassword, formValues.saveCredentions);
      await this.appSettings.SaveIntegrarComOrbit(true);
      this.router.navigate(['/dashboard']);
    }

  }

  async loginOrbit(email: string, cPassword: string) {
    try {
      const isAuthenticated = await this.authService.login(email, cPassword);
      return isAuthenticated;
    }
    catch (erro) {
      this.notificationService.showNotification("Falha ao realizar login no orbit","E-mail ou senha incorretos","error");
      return false;
    }
  }

  async cancelar(event: Event) {
    await this.appSettings.SaveIntegrarComOrbit(false);
    //event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/dashboard']);
  }
}

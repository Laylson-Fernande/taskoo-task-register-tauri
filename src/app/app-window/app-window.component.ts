import { Component } from '@angular/core';
import { LoadingService } from "src/services/app/loading.service";
import { Router } from '@angular/router';
import { AppSettings } from 'src/utils/app.settings';

@Component({
  selector: 'app-app-window',
  templateUrl: './app-window.component.html',
  styleUrls: ['./app-window.component.css']
})
export class AppWindowComponent {

  constructor(public loadingService: LoadingService, private router:Router, private appSettings: AppSettings ) {
  }

  abrirConfiguracoes(){
    this.router.navigate(["/settings"]);
  }
}

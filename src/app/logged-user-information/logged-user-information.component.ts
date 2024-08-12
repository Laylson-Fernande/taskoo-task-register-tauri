import { Component } from '@angular/core';

@Component({
  selector: 'app-logged-user-information',
  templateUrl: './logged-user-information.component.html',
  styleUrls: ['./logged-user-information.component.css']
})
export class LoggedUserInformationComponent {

  loggerUserName(){
    return sessionStorage.getItem("user_name");
  }
}

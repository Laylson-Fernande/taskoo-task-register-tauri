import { Component } from "@angular/core";
import { invoke } from "@tauri-apps/api/tauri";
import { LoadingService } from "src/services/app/loading.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  greetingMessage = "";

  constructor(public loadingService: LoadingService) {}
  
  greet(event: SubmitEvent, name: string): void {
    event.preventDefault();

    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    invoke<string>("greet", { name }).then((text) => {
      this.greetingMessage = text;
    });
  }
}

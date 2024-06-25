import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmacao-exclusao-registro',
  templateUrl: './confirmacao-exclusao-registro.component.html',
  styleUrls: ['./confirmacao-exclusao-registro.component.css']
})
export class ConfirmacaoExclusaoRegistroComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmacaoExclusaoRegistroComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { registro: any }
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-registro-hora-editar-dialog',
  templateUrl: './registro-hora-editar-dialog.component.html',
  styleUrls: ['./registro-hora-editar-dialog.component.css']
})
export class RegistroHoraEditarDialogComponent {
  registroEdicao :any;
  constructor(
    public dialogRef: MatDialogRef<RegistroHoraEditarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { registroHora: any }
  ) {
  }

  ngOnInit() {
    this.registroEdicao = this.data.registroHora;
  }

  fecharDialog() {
      this.dialogRef.close(this.registroEdicao); // Fecha o diálogo e retorna os dados editados
  }
}

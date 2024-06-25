import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';

interface UserAuthtentication {
    token: string;
    data: {
        pk: string;
        user_id: string;
    };
}

interface UserCredentials {
    username: string;
    cPassword: string;
}

@Injectable({
    providedIn: 'root'
})

export class AuthService {

    private currentUserSubject = new BehaviorSubject<any>(null);
    currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) { }

    async login(userEmail: string, password: string) {

        const credentials: UserCredentials = { username: userEmail, cPassword: password }

        try {

            const response = await firstValueFrom(this.http.post<UserAuthtentication>('https://api.orbitspot.com/auth', credentials));
            sessionStorage.setItem('token', response.token);
            sessionStorage.setItem('x-api-key', response.data.pk);
            sessionStorage.setItem('user_id', response.data.user_id);
            let date = new Date();
            date.setHours(date.getHours() + 2);
            sessionStorage.setItem('token-lifetime', date.getTime().toString())
            this.currentUserSubject.next(response);
            return true;
        } catch (error) {
            throw error;
            //return false;
        }

        /*
                this.http.post<UserAuthtentication>('https://api.orbitspot.com/auth', credentials).subscribe(
                    (user) => {
                        sessionStorage.setItem('token', user.token);
                        sessionStorage.setItem('x-api-key', user.data.pk);
                        sessionStorage.setItem('user_id', user.data.user_id);
                        this.currentUserSubject.next(user); // Atribui os registros à variável do componente
                    },
                    (error) => {
                      console.error('Erro ao obter registros:', error);
                      // Lógica para lidar com o erro
                    }
                  );
                  
                    .pipe(
                        tap(user => {
                            sessionStorage.setItem('token', user.token);
                            sessionStorage.setItem('x-api-key', user.token);
                            this.currentUserSubject.next(user);
                        })
                    );
                    */
    }

    logout() {
        sessionStorage.removeItem('token');
        this.currentUserSubject.next(null);
    }

    isAuthenticated(): boolean {
        const tokenLifeTime = sessionStorage.getItem('token-lifetime');
        if(tokenLifeTime){
            const currentTime = new Date().getTime();
            if(currentTime > Number(tokenLifeTime)) {
                this.logout();
            }
        }
        return !!sessionStorage.getItem('token') && !!sessionStorage.getItem('x-api-key');
    }
}

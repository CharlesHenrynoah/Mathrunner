import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { schemaInsertionUtilisateur, schemaConnexion, type InsertionUtilisateur, type DonneesConnexion } from "@shared/schema";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<DonneesConnexion>({
    resolver: zodResolver(schemaConnexion),
    defaultValues: { nomUtilisateur: "", motDePasse: "" }
  });

  const registerForm = useForm<InsertionUtilisateur>({
    resolver: zodResolver(schemaInsertionUtilisateur),
    defaultValues: { 
      nomUtilisateur: "", 
      email: "",
      motDePasse: "", 
      confirmationMotDePasse: "" 
    }
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Math Runner</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="register">Inscription</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="login-username">Nom d'utilisateur</Label>
                      <Input id="login-username" {...loginForm.register("nomUtilisateur")} />
                      {loginForm.formState.errors.nomUtilisateur && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.nomUtilisateur.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <Input 
                        id="login-password" 
                        type="password" 
                        {...loginForm.register("motDePasse")} 
                      />
                      {loginForm.formState.errors.motDePasse && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.motDePasse.message}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      Se connecter
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="register-username">Nom d'utilisateur</Label>
                      <Input id="register-username" {...registerForm.register("nomUtilisateur")} />
                      {registerForm.formState.errors.nomUtilisateur && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.nomUtilisateur.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="register-email">Email</Label>
                      <Input 
                        id="register-email" 
                        type="email" 
                        {...registerForm.register("email")} 
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="register-password">Mot de passe</Label>
                      <Input 
                        id="register-password" 
                        type="password" 
                        {...registerForm.register("motDePasse")} 
                      />
                      {registerForm.formState.errors.motDePasse && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.motDePasse.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="register-confirm-password">Confirmer le mot de passe</Label>
                      <Input 
                        id="register-confirm-password" 
                        type="password" 
                        {...registerForm.register("confirmationMotDePasse")} 
                      />
                      {registerForm.formState.errors.confirmationMotDePasse && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.confirmationMotDePasse.message}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      S'inscrire
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <div className="hidden md:flex items-center justify-center bg-primary p-8">
        <div className="text-primary-foreground max-w-md space-y-4">
          <h1 className="text-4xl font-bold">Bienvenue sur Math Runner!</h1>
          <p>Testez vos compétences en mathématiques et suivez votre progression.</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Différents types de problèmes</li>
            <li>Système de progression par niveau</li>
            <li>Suivi de vos statistiques</li>
            <li>Défiez-vous vous-même</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
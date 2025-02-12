import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatistiquesPartie } from "@shared/schema";
import { format } from "date-fns";
import { Loader2, Trophy, Star, Activity, Brain, Clock, Target } from "lucide-react";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();

  const { data: stats, isLoading } = useQuery<StatistiquesPartie>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <div className="space-x-4">
            <Link href="/">
              <Button variant="outline">Jouer</Button>
            </Link>
            <Button
              variant="destructive"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Statistiques Générales */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meilleur score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.meilleurScore ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score moyen</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.scoreMoyen ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Précision globale</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.precisionGlobale ?? 0}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temps moyen de réponse</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.tempsReponseMoyen ? stats.tempsReponseMoyen.toFixed(2) : "0.00"}s
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistiques détaillées */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Statistiques par type */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques par type</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Correctes</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Précision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(stats?.statsParType ?? {}).map(([type, data]) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium capitalize">{type}</TableCell>
                      <TableCell>{data.correctes}</TableCell>
                      <TableCell>{data.total}</TableCell>
                      <TableCell>{data.precision}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Dernière partie */}
          <Card>
            <CardHeader>
              <CardTitle>Dernière partie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">{stats?.dernièrePartie?.score ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Niveau atteint</p>
                  <p className="text-2xl font-bold">{stats?.dernièrePartie?.niveau ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Questions correctes</p>
                  <p className="text-2xl font-bold">{stats?.dernièrePartie?.correctes ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Questions incorrectes</p>
                  <p className="text-2xl font-bold">{stats?.dernièrePartie?.incorrectes ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Temps moyen de réponse</p>
                  <p className="text-2xl font-bold">
                    {stats?.dernièrePartie?.tempsReponse ? stats.dernièrePartie.tempsReponse.toFixed(2) : "0.00"}s
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meilleur type</p>
                  <p className="text-2xl font-bold capitalize">{stats?.dernièrePartie?.meilleurType ?? "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historique des parties */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des parties</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Types de problèmes rencontrés</TableHead>
                  <TableHead>Niveau max atteint</TableHead>
                  <TableHead>Score de la partie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.partiesRecentes?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.dateCreation), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="capitalize">{record.typeProbleme}</TableCell>
                    <TableCell>{record.niveau}</TableCell>
                    <TableCell>{record.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
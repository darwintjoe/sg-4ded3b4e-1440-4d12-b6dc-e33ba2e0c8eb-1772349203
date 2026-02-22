... existing content before backup tab ...

<TabsContent value="backup" className="h-[calc(100vh-150px)] overflow-y-auto space-y-4 p-4 mt-0">
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {translate("settings.changeAdminPIN", language)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPin">{translate("settings.currentPIN", language)}</Label>
          <Input
            id="currentPin"
            type="password"
            maxLength={6}
            placeholder="****"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPin">{translate("settings.newPIN", language)}</Label>
          <Input
            id="newPin"
            type="password"
            maxLength={6}
            placeholder="****"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPin">{translate("settings.confirmPIN", language)}</Label>
          <Input
            id="confirmPin"
            type="password"
            maxLength={6}
            placeholder="****"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Button 
          onClick={handleChangeAdminPin} 
          className="w-full"
          disabled={!currentPin || !newPin || !confirmPin || newPin.length < 4}
        >
          {translate("settings.changePIN", language)}
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            {translate("settings.dataBackup", language)}
          </div>
          {isSignedIn && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {translate("settings.protected", language)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isInitialized ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{translate("common.loading", language)}</span>
          </div>
        ) : !isSignedIn ? (
          <>
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {translate("settings.backup.signInHint", language)}
              </AlertDescription>
            </Alert>
            <Button onClick={handleGoogleSignIn} className="w-full" size="sm">
              <Cloud className="h-4 w-4 mr-2" />
              {translate("settings.backup.connect", language)}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <img 
                src={user?.picture} 
                alt={user?.name} 
                className="h-10 w-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {backupStatus && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{translate("settings.backup.lastBackup", language)}</span>
                  <span className={backupStatus.isHealthy ? "text-green-600" : "text-amber-600"}>
                    {backupStatus.lastBackupTime 
                      ? new Date(backupStatus.lastBackupTime).toLocaleString()
                      : translate("settings.backup.never", language)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{translate("settings.backup.status", language)}</span>
                  <Badge variant={backupStatus.isHealthy ? "default" : "secondary"}>
                    {backupStatus.message}
                  </Badge>
                </div>
              </div>
            )}

            <Button 
              onClick={handleBackupNow} 
              className="w-full" 
              disabled={backupProcessing}
            >
              {backupProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {translate("settings.backup.backingUp", language)}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {translate("settings.backup.backupNow", language)}
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={() => {
                signOut();
                updateAndSave({
                  googleDriveLinked: false,
                  googleAccountEmail: undefined
                });
              }} 
              className="w-full"
              size="sm"
            >
              {translate("settings.backup.disconnect", language)}
            </Button>
          </>
        )}
      </CardContent>
    </Card>

    {isSignedIn && backupStatus?.canRestore && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {translate("settings.backup.restore", language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {translate("settings.backup.restoreHint", language)}
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={initiateRestore} 
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {translate("settings.backup.startRestore", language)}
          </Button>
        </CardContent>
      </Card>
    )}
  </div>
</TabsContent>

... rest of file ...
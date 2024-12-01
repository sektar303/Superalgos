exports.newGovernanceFunctionLibraryAirdropProgram = function newGovernanceFunctionLibraryAirdropProgram() {
    let thisObject = {
        calculate: calculate
    }

    return thisObject

    async function calculate(pools, userProfilesArray) {
        SA.logger.info('[AirdropProgram] Starting calculation of Airdrop Program.')

        // Obtener el pool "Airdrop Rewards"
        let programPoolTokenReward = undefined
        for (let i = 0; i < pools.length; i++) {
            let poolsNode = pools[i]
            let tokens = SA.projects.governance.utilities.pools.findPool(poolsNode, "Airdrop-Rewards")
            if (tokens !== undefined) {
                programPoolTokenReward = tokens
                break
            }
        }

        if (programPoolTokenReward === undefined || programPoolTokenReward === 0) {
            SA.logger.warn('[AirdropProgram] programPoolTokenReward is undefined or zero. Exiting calculation.')
            return
        }

        SA.logger.info(`[AirdropProgram] programPoolTokenReward: ${programPoolTokenReward}`)

        // Reiniciar datos del programa para cada perfil de usuario
        for (let [id, userProfile] of userProfilesArray) {
            resetProgram(userProfile)
        }

        // Validar y recopilar programas activos
        let activePrograms = []
        for (let [id, userProfile] of userProfilesArray) {
            let airdropProgram = SA.projects.governance.utilities.validations.onlyOneProgram(userProfile, "Airdrop Program")
            if (airdropProgram === undefined) { continue }
            if (validateProgram(airdropProgram, userProfile)) {
                activePrograms.push({ program: airdropProgram, userProfile: userProfile })
            }
        }

        // Distribuir el poder del programa y acumular el poder total
        let accumulatedProgramPower = 0
        for (let i = 0; i < activePrograms.length; i++) {
            let { program, userProfile } = activePrograms[i]
            let programPower = distributeProgram(program, userProfile)
            accumulatedProgramPower += programPower
        }

        // Verificar si el poder acumulado es cero para evitar división por cero
        if (accumulatedProgramPower === 0) {
            SA.logger.warn('[AirdropProgram] Accumulated Program Power is zero. Exiting calculation.')
            return
        }

        // Calcular las recompensas
        for (let i = 0; i < activePrograms.length; i++) {
            let { program, userProfile } = activePrograms[i]
            calculateProgram(program, accumulatedProgramPower, programPoolTokenReward)
        }

        SA.logger.info('[AirdropProgram] Calculation of Airdrop Program completed.')

        // Funciones internas
        function resetProgram(userProfile) {
            let airdropProgram = SA.projects.governance.utilities.validations.onlyOneProgram(userProfile, "Airdrop Program")
            if (airdropProgram === undefined) { return }
            if (airdropProgram.payload === undefined) { airdropProgram.payload = {} }
            airdropProgram.payload.airdropProgram = {
                count: 0,
                percentage: 0,
                outgoingPower: 0,
                ownPower: 0,
                incomingPower: 0,
                awarded: {
                    tokens: 0,
                    percentage: 0
                },
                isActive: false
            }

            SA.logger.info(`[AirdropProgram] Reset program for user: ${userProfile.name}`)
        }

        function validateProgram(airdropProgram, userProfile) {
            if (userProfile.balance === undefined || userProfile.balance === 0) {
                SA.logger.warn(`[AirdropProgram] User profile ${userProfile.name} has undefined or zero balance.`)
                return false
            }

            let profileSignature = userProfile.config.signature
            if (profileSignature === undefined) {
                SA.logger.warn(`[AirdropProgram] User profile ${userProfile.name} has undefined signature.`)
                return false
            }

            airdropProgram.payload.airdropProgram.isActive = true
            SA.logger.info(`[AirdropProgram] Program is active for user: ${userProfile.name}`)
            return true
        }

        function distributeProgram(airdropProgram, userProfile) {
            if (airdropProgram === undefined || airdropProgram.payload === undefined) { return 0 }
            let programPower = airdropProgram.payload.tokenPower || 0
            airdropProgram.payload.airdropProgram.ownPower = programPower

            SA.logger.info(`[AirdropProgram] Distribute program power: ${programPower} for user: ${userProfile.name}`)

            return programPower
        }

        function calculateProgram(airdropProgram, accumulatedProgramPower, programPoolTokenReward) {
            if (airdropProgram.payload === undefined) { return }
            let ownPower = airdropProgram.payload.airdropProgram.ownPower || 0
            let totalPowerRewardRatio = accumulatedProgramPower / programPoolTokenReward

            if (totalPowerRewardRatio < 1) { totalPowerRewardRatio = 1 }

            let awardedTokens = ownPower / totalPowerRewardRatio
            airdropProgram.payload.airdropProgram.awarded.tokens = awardedTokens

            SA.logger.info(`[AirdropProgram] Calculated awarded tokens: ${awardedTokens} for user: ${airdropProgram.name}`)
        }
    }
}

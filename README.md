# Warcraftprogress API

This is the first draft to understand our API. We make this API after wowprogress didn't allow us to use their data, so we have only the last 3 raids in our database.

 - The Nighthold - Tier 19
 - Trial of Valor - Tier 19
 - The Emerald Nightmare - Tier 19

**Guild Progress**  
/api/v1/progress/:tier/:raid_name/:guild_region/:guild_realm/:guild_name

tier: 19
raid_name: The Nighthold, Trial of Valor or The Emerald Nightmare
guild_region: us / eu / tw
guild_realm: Realm in local en_GB
guild_name: The guild name

You get an object with all the raid kills.

    {
	    difficulty: {
		    boss_name: {
			    timestamps: [Array,Array...]
			    irrelevantTimestamps: [Array,Array]
			}
		}
    }

*Exemple*  
https://api.warcraftprogress.com/api/v1/progress/19/The%20Emerald%20Nightmare/eu/Tarren%20Mill/Method

**Kill Roster**  
/api/v1/kills/:tier/:raid_name/:guild_region/:guild_realm/:guild_name/:difficulty/:boss_name/:timestamp
  
tier: 19  
raid_name: The Nighthold, Trial of Valor or The Emerald Nightmare  
guild_region: us / eu / tw  
guild_realm: Realm in local en_GB  
guild_name: The guild name  
difficulty: normal, heroic or mythic  
boss_name: The boss name  
timestamp: timestampArray.join('+')  

 *Exemple*  
https://api.warcraftprogress.com/api/v1/kills/19/Trial%20of%20Valor/eu/Tarren%20Mill/Method/mythic/Guarm/1479929888000
 https://api.warcraftprogress.com/api/v1/kills/19/The%20Emerald%20Nightmare/eu/Tarren%20Mill/Method/heroic/Il'gynoth,%20Heart%20of%20Corruption/1475055525000+1475055526000

**Guild Rank**  
/api/v1/rank/:tier/:raid_name/:guild_region/:guild_realm/:guild_name

tier: 19
raid_name: The Nighthold, Trial of Valor or The Emerald Nightmare
guild_region: us / eu / tw
guild_realm: Realm in local en_GB
guild_name: The guild name

 *Exemple*  
https://api.warcraftprogress.com/api/v1/ranks/19/The%20Emerald%20Nightmare/eu/Tarren%20Mill/Method

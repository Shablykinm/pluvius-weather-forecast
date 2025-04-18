const _ = require('lodash');
const moment = require('moment-timezone');

class StateManager {
    constructor() {
        this.states = new Map(); // Хранит { state: ..., lastCheckDay: ... }
    }

    getState(serviceName) {
        const entry = this.states.get(serviceName);
        return entry ? entry.state : null;
    }

    _arePrecipPeriodsEqual(a, b) {
        if (a.length !== b.length) return false;
        const aKeys = a.map(p => `${p.start}-${p.end}`).sort();
        const bKeys = b.map(p => `${p.start}-${p.end}`).sort();
        return JSON.stringify(aKeys) === JSON.stringify(bKeys);
    }
    
    setState(serviceName, newState) {
        const cleanNewState = this._cleanState(newState);
        const prevEntry = this.states.get(serviceName) || { state: null, lastCheckDay: null };
        
        const currentDay = moment(cleanNewState.currentPeriod.start)
            .tz('Europe/Moscow')
            .format('YYYY-MM-DD');
            
        const dayChanged = currentDay !== prevEntry.lastCheckDay;
        
        let precipChanged = false;
        if (prevEntry.state) {
            const prevPrecip = [
                ...(prevEntry.state.currentRain ? [prevEntry.state.currentRain] : []),
                ...(prevEntry.state.futureRains || [])
            ];
            const newPrecip = [
                ...(cleanNewState.currentRain ? [cleanNewState.currentRain] : []),
                ...(cleanNewState.futureRains || [])
            ];
            precipChanged = !this._arePrecipPeriodsEqual(prevPrecip, newPrecip);
        } else {
            precipChanged = true;
        }
        
        const changed = precipChanged || dayChanged;
        
        this.states.set(serviceName, {
            state: cleanNewState,
            lastCheckDay: currentDay
        });
        
        return {
            changed,
            dayChanged,
            prevState: prevEntry.state,
            newState: cleanNewState
        };
    }
    _comparePrecipitations(prevPrecip, newPrecip) {
        if (!prevPrecip && !newPrecip) return true; // оба отсутствуют
        if (!prevPrecip || !newPrecip) return false; // один отсутствует
        
        // Сравниваем массивы поэлементно
        return prevPrecip.length === newPrecip.length && 
               prevPrecip.every((val, i) => val === newPrecip[i]);
    }

    _cleanState(state) {
        // Удаляем технические поля, которые не должны влиять на сравнение
        return _.omit(state, ['timestamp', 'message']);
    }
}

module.exports = new StateManager(); // Сохраняем как singleton